import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  List<dynamic> _conversations = [];
  Map<String, dynamic> _partners = {};
  bool _loading = true;
  String? _activeId;
  List<dynamic> _messages = [];
  bool _loadingMsgs = false;
  final _msgCtrl = TextEditingController();
  bool _sending = false;
  bool _showSearch = false;
  final _searchCtrl = TextEditingController();
  List<dynamic> _searchResults = [];
  bool _searching = false;

  @override
  void initState() { super.initState(); _loadConversations(); }

  @override
  void dispose() { _msgCtrl.dispose(); _searchCtrl.dispose(); super.dispose(); }

  Future<void> _loadConversations() async {
    final token = context.read<AuthService>().token;
    if (token == null) return;
    setState(() => _loading = true);
    try {
      final convs = await ApiService.getConversations(token);
      final map = <String, dynamic>{};
      for (final c in convs) {
        final uid = c['outro_utilizador_id'];
        try { map[uid] = await ApiService.getUser(uid); } catch (_) {}
      }
      if (mounted) setState(() {
        _conversations = convs; _partners = map; _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openConversation(String userId) async {
    final token = context.read<AuthService>().token!;
    setState(() { _activeId = userId; _loadingMsgs = true; });
    try {
      final msgs = await ApiService.getConversation(token, userId);
      if (mounted) setState(() { _messages = List.from(msgs.reversed); _loadingMsgs = false; });
    } catch (_) {
      if (mounted) setState(() => _loadingMsgs = false);
    }
  }

  Future<void> _sendMessage() async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty || _activeId == null || _sending) return;
    final token = context.read<AuthService>().token!;
    setState(() => _sending = true);
    try {
      final msg = await ApiService.sendMessage(token, _activeId!, text);
      _msgCtrl.clear();
      if (mounted) setState(() => _messages.add(msg));
    } catch (_) {} finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _search(String q) async {
    if (q.trim().isEmpty) { setState(() => _searchResults = []); return; }
    final token = context.read<AuthService>().token!;
    setState(() => _searching = true);
    try {
      final me = context.read<AuthService>().user?['id'];
      final res = await ApiService.searchUsers(token, q);
      if (mounted) setState(() {
        _searchResults = res.where((u) => u['id'] != me).toList();
        _searching = false;
      });
    } catch (_) {
      if (mounted) setState(() => _searching = false);
    }
  }

  void _startConversation(Map<String, dynamic> user) {
    final uid = user['id'];
    setState(() {
      _partners[uid] = user;
      if (!_conversations.any((c) => c['outro_utilizador_id'] == uid)) {
        _conversations.insert(0, {'outro_utilizador_id': uid, 'mensagens_nao_lidas': 0, 'ultima_mensagem': null});
      }
      _activeId = uid;
      _showSearch = false;
      _searchCtrl.clear();
      _searchResults = [];
    });
    _openConversation(uid);
  }

  String _timeAgo(String iso) {
    final diff = DateTime.now().difference(DateTime.parse(iso));
    if (diff.inMinutes < 1) return 'agora';
    if (diff.inHours < 1) return '${diff.inMinutes}m';
    if (diff.inDays < 1) return '${diff.inHours}h';
    return iso.substring(0, 10);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    if (!auth.isAuthenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Mensagens')),
        body: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.chat_bubble_outline, size: 48, color: Colors.grey.shade400),
          const SizedBox(height: 12),
          const Text('Entre para usar o chat'),
        ])),
      );
    }
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: _activeId != null ? _buildChat(scheme, auth) : _buildConversationList(scheme, auth),
    );
  }

  Widget _buildConversationList(ColorScheme scheme, AuthService auth) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mensagens'),
        actions: [
          IconButton(
            icon: Icon(_showSearch ? Icons.close : Icons.person_add_alt_outlined),
            onPressed: () => setState(() {
              _showSearch = !_showSearch;
              _searchCtrl.clear(); _searchResults = [];
            }),
          ),
        ],
      ),
      body: Column(children: [
        if (_showSearch) ...[
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _searchCtrl,
              autofocus: true,
              onChanged: _search,
              decoration: InputDecoration(
                hintText: 'Procurar utilizadores…',
                isDense: true,
                prefixIcon: const Icon(Icons.search, size: 18),
                suffixIcon: _searching
                  ? const Padding(padding: EdgeInsets.all(12),
                      child: SizedBox(width: 14, height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2)))
                  : null,
              ),
            ),
          ),
          if (_searchResults.isNotEmpty)
            Expanded(child: ListView.builder(
              itemCount: _searchResults.length,
              itemBuilder: (_, i) {
                final u = _searchResults[i];
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: scheme.primary.withOpacity(0.15),
                    child: Text(
                      (u['nome'] as String? ?? '?').isNotEmpty
                        ? (u['nome'] as String)[0].toUpperCase() : '?',
                      style: TextStyle(color: scheme.primary, fontWeight: FontWeight.bold))),
                  title: Text(u['nome'] ?? ''),
                  subtitle: Text(u['role'] ?? ''),
                  onTap: () => _startConversation(u),
                );
              },
            )),
        ] else
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _conversations.isEmpty
                    ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.chat_bubble_outline, size: 48, color: Colors.grey.shade400),
                        const SizedBox(height: 12),
                        const Text('Sem conversas ainda'),
                        const SizedBox(height: 4),
                        Text('Toque em + para iniciar uma conversa',
                          style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                      ]))
                    : ListView.separated(
                        itemCount: _conversations.length,
                        separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
                        itemBuilder: (_, i) {
                          final c = _conversations[i];
                          final uid = c['outro_utilizador_id'];
                          final p = _partners[uid];
                          final initials = p != null && (p['nome'] as String? ?? '').isNotEmpty
                            ? (p['nome'] as String)[0].toUpperCase() : '?';
                          final lastMsg = c['ultima_mensagem'];
                          final unread = c['mensagens_nao_lidas'] ?? 0;
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: scheme.primary.withOpacity(0.15),
                              child: Text(initials, style: TextStyle(
                                fontWeight: FontWeight.bold, color: scheme.primary))),
                            title: Text(p?['nome'] ?? 'Utilizador',
                              style: const TextStyle(fontWeight: FontWeight.w600)),
                            subtitle: Text(
                              lastMsg?['conteudo'] ?? 'Iniciar conversa…',
                              maxLines: 1, overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                            trailing: unread > 0
                              ? CircleAvatar(radius: 10, backgroundColor: scheme.primary,
                                  child: Text('$unread', style: const TextStyle(fontSize: 10, color: Colors.white)))
                              : null,
                            onTap: () {
                              if (p != null) _partners[uid] = p;
                              _openConversation(uid);
                            },
                          );
                        },
                      ),
          ),
      ]),
    );
  }

  Widget _buildChat(ColorScheme scheme, AuthService auth) {
    final me = auth.user?['id'];
    final partner = _partners[_activeId];
    final initials = partner != null && (partner['nome'] as String? ?? '').isNotEmpty
      ? (partner['nome'] as String)[0].toUpperCase() : '?';

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => setState(() => _activeId = null),
        ),
        title: Row(children: [
          CircleAvatar(radius: 16,
            backgroundColor: scheme.primary.withOpacity(0.15),
            child: Text(initials, style: TextStyle(fontWeight: FontWeight.bold, color: scheme.primary, fontSize: 13))),
          const SizedBox(width: 10),
          Text(partner?['nome'] ?? 'Utilizador', style: const TextStyle(fontSize: 16)),
        ]),
      ),
      body: Column(children: [
        Expanded(
          child: _loadingMsgs
              ? const Center(child: CircularProgressIndicator())
              : _messages.isEmpty
                  ? Center(child: Text('Sem mensagens ainda — diga olá! 👋',
                      style: TextStyle(color: Colors.grey.shade500)))
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _messages.length,
                      itemBuilder: (_, i) {
                        final msg = _messages[i];
                        final isMine = msg['remetente_id'] == me;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            mainAxisAlignment: isMine ? MainAxisAlignment.end : MainAxisAlignment.start,
                            children: [
                              Container(
                                constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.7),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: isMine ? scheme.primary : scheme.primary.withOpacity(0.08),
                                  borderRadius: BorderRadius.only(
                                    topLeft: const Radius.circular(16),
                                    topRight: const Radius.circular(16),
                                    bottomLeft: Radius.circular(isMine ? 16 : 4),
                                    bottomRight: Radius.circular(isMine ? 4 : 16),
                                  ),
                                ),
                                child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                                  Text(msg['conteudo'] ?? '',
                                    style: TextStyle(
                                      color: isMine ? Colors.white : Colors.black87, fontSize: 14)),
                                  const SizedBox(height: 2),
                                  Text(
                                    _timeAgo(msg['criado_em'] ?? ''),
                                    style: TextStyle(fontSize: 10,
                                      color: isMine ? Colors.white60 : Colors.grey.shade500)),
                                ]),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
            border: Border(top: BorderSide(color: Colors.grey.shade200))),
          child: SafeArea(
            child: Row(children: [
              Expanded(child: TextField(
                controller: _msgCtrl,
                onSubmitted: (_) => _sendMessage(),
                decoration: const InputDecoration(
                  hintText: 'Escreva uma mensagem…',
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                ),
              )),
              const SizedBox(width: 8),
              IconButton(
                onPressed: _sending ? null : _sendMessage,
                icon: _sending
                  ? const SizedBox(width: 20, height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : Icon(Icons.send_rounded, color: scheme.primary),
                style: IconButton.styleFrom(
                  backgroundColor: scheme.primary.withOpacity(0.1)),
              ),
            ]),
          ),
        ),
      ]),
    );
  }
}
