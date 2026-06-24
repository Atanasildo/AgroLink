import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';

const Map<String, String> _tipoLabels = {
  '': '🌐 Todos',
  'duvida': '❓ Dúvidas',
  'dica': '💡 Dicas',
  'experiencia': '🌱 Experiências',
  'noticia': '📰 Notícias',
};

class SocialScreen extends StatefulWidget {
  const SocialScreen({super.key});
  @override
  State<SocialScreen> createState() => _SocialScreenState();
}

class _SocialScreenState extends State<SocialScreen> {
  List<dynamic> _posts = [];
  bool _loading = true;
  String _filtro = '';
  final _composerCtrl = TextEditingController();
  String _tipo = 'experiencia';
  bool _publishing = false;

  @override
  void initState() { super.initState(); _load(); }

  @override
  void dispose() { _composerCtrl.dispose(); super.dispose(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final auth = context.read<AuthService>();
      final data = await ApiService.getPosts(
        tipo: _filtro.isEmpty ? null : _filtro,
        token: auth.token,
      );
      if (mounted) setState(() { _posts = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _publish() async {
    final text = _composerCtrl.text.trim();
    if (text.isEmpty || _publishing) return;
    final token = context.read<AuthService>().token!;
    setState(() => _publishing = true);
    try {
      final post = await ApiService.createPost(token, text, _tipo);
      _composerCtrl.clear();
      if (mounted) setState(() { _posts = [post, ..._posts]; });
    } catch (_) {} finally {
      if (mounted) setState(() => _publishing = false);
    }
  }

  Future<void> _toggleLike(Map<String, dynamic> post) async {
    final token = context.read<AuthService>().token;
    if (token == null) return;
    // Optimistic
    setState(() {
      final idx = _posts.indexWhere((p) => p['id'] == post['id']);
      if (idx >= 0) {
        final liked = _posts[idx]['curtido_por_mim'] == true;
        _posts[idx] = Map<String, dynamic>.from(_posts[idx])
          ..['curtido_por_mim'] = !liked
          ..['likes_count'] = (_posts[idx]['likes_count'] ?? 0) + (liked ? -1 : 1);
      }
    });
    try {
      await ApiService.toggleLike(token, post['id']);
    } catch (_) {
      await _load(); // revert
    }
  }

  String _timeAgo(String iso) {
    final diff = DateTime.now().difference(DateTime.parse(iso));
    if (diff.inMinutes < 1) return 'agora';
    if (diff.inHours < 1) return '${diff.inMinutes}m';
    if (diff.inDays < 1) return '${diff.inHours}h';
    if (diff.inDays < 30) return '${diff.inDays}d';
    return iso.substring(0, 10);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final auth = context.watch<AuthService>();

    return Scaffold(
      appBar: AppBar(title: const Text('Comunidade')),
      body: Column(children: [
        // Tipo filter chips
        SizedBox(
          height: 48,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            children: _tipoLabels.entries.map((e) {
              final sel = _filtro == e.key;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: FilterChip(
                  label: Text(e.value), selected: sel,
                  onSelected: (_) { setState(() => _filtro = e.key); _load(); },
                  selectedColor: scheme.primary.withOpacity(0.15),
                  checkmarkColor: scheme.primary,
                ),
              );
            }).toList(),
          ),
        ),
        const Divider(height: 1),
        // Composer
        if (auth.isAuthenticated)
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(children: [
              TextField(
                controller: _composerCtrl,
                maxLines: 3, minLines: 2,
                decoration: const InputDecoration(
                  hintText: 'Partilhe uma dúvida, dica ou experiência…',
                  contentPadding: EdgeInsets.all(12),
                ),
              ),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(child: SizedBox(
                  height: 32,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      {'value': 'duvida', 'label': '❓ Dúvida'},
                      {'value': 'dica', 'label': '💡 Dica'},
                      {'value': 'experiencia', 'label': '🌱 Experiência'},
                      {'value': 'noticia', 'label': '📰 Notícia'},
                    ].map((t) {
                      final sel = _tipo == t['value'];
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ChoiceChip(
                          label: Text(t['label']!,
                            style: const TextStyle(fontSize: 11)),
                          selected: sel,
                          onSelected: (_) => setState(() => _tipo = t['value']!),
                          selectedColor: scheme.primary.withOpacity(0.15),
                        ),
                      );
                    }).toList(),
                  ),
                )),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: _publishing ? null : _publish,
                  icon: _publishing
                    ? const SizedBox(width: 14, height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.send, size: 14),
                  label: const Text('Publicar'),
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size(0, 36),
                    padding: const EdgeInsets.symmetric(horizontal: 14)),
                ),
              ]),
            ]),
          ),
        if (auth.isAuthenticated) const Divider(height: 1),
        // Feed
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _posts.isEmpty
                  ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.people_alt_outlined, size: 48, color: Colors.grey.shade400),
                      const SizedBox(height: 12),
                      const Text('Sem publicações ainda'),
                    ]))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _posts.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (_, i) => _PostCard(
                          post: _posts[i],
                          onLike: () => _toggleLike(_posts[i]),
                          timeAgo: _timeAgo,
                          scheme: scheme,
                          currentUserId: auth.user?['id'],
                        ),
                      ),
                    ),
        ),
      ]),
    );
  }
}

class _PostCard extends StatefulWidget {
  final Map<String, dynamic> post;
  final VoidCallback onLike;
  final String Function(String) timeAgo;
  final ColorScheme scheme;
  final String? currentUserId;
  const _PostCard({required this.post, required this.onLike, required this.timeAgo,
    required this.scheme, this.currentUserId});
  @override
  State<_PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<_PostCard> {
  bool _showComments = false;
  List<dynamic> _comments = [];
  bool _loadingComments = false;
  final _commentCtrl = TextEditingController();
  bool _sendingComment = false;

  @override
  void dispose() { _commentCtrl.dispose(); super.dispose(); }

  Future<void> _loadComments() async {
    if (_loadingComments) return;
    setState(() => _loadingComments = true);
    try {
      final data = await ApiService.getComments(widget.post['id']);
      if (mounted) setState(() { _comments = data; _loadingComments = false; });
    } catch (_) {
      if (mounted) setState(() => _loadingComments = false);
    }
  }

  Future<void> _sendComment() async {
    final text = _commentCtrl.text.trim();
    if (text.isEmpty || _sendingComment) return;
    final token = context.read<AuthService>().token;
    if (token == null) return;
    setState(() => _sendingComment = true);
    try {
      final c = await ApiService.addComment(token, widget.post['id'], text);
      _commentCtrl.clear();
      if (mounted) setState(() => _comments.add(c));
    } catch (_) {} finally {
      if (mounted) setState(() => _sendingComment = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.post;
    final autor = p['autor'] ?? {};
    final liked = p['curtido_por_mim'] == true;
    final scheme = widget.scheme;
    final initials = (autor['nome'] as String? ?? '?').isNotEmpty
        ? (autor['nome'] as String)[0].toUpperCase() : '?';

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: Colors.grey.shade200)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Header
          Row(children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: scheme.primary.withOpacity(0.15),
              child: Text(initials, style: TextStyle(fontWeight: FontWeight.bold, color: scheme.primary)),
            ),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(autor['nome'] ?? 'Utilizador',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              Text(
                '${autor['role'] ?? ''} · ${widget.timeAgo(p['criado_em'] ?? '')}',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
            ])),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: scheme.primary.withOpacity(0.08),
                borderRadius: BorderRadius.circular(12)),
              child: Text(
                _tipoLabels[p['tipo']] ?? p['tipo'] ?? '',
                style: TextStyle(fontSize: 10, color: scheme.primary, fontWeight: FontWeight.w600)),
            ),
          ]),
          const SizedBox(height: 10),
          Text(p['conteudo'] ?? '', style: const TextStyle(fontSize: 14, height: 1.4)),
          const SizedBox(height: 12),
          // Actions
          Row(children: [
            InkWell(
              onTap: widget.onLike,
              borderRadius: BorderRadius.circular(4),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: Row(children: [
                  Icon(liked ? Icons.favorite : Icons.favorite_border,
                    size: 16, color: liked ? Colors.red : Colors.grey),
                  const SizedBox(width: 4),
                  Text('${p['likes_count'] ?? 0}', style: const TextStyle(fontSize: 13)),
                ]),
              ),
            ),
            const SizedBox(width: 4),
            InkWell(
              onTap: () {
                setState(() => _showComments = !_showComments);
                if (_showComments && _comments.isEmpty) _loadComments();
              },
              borderRadius: BorderRadius.circular(4),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: Row(children: [
                  Icon(Icons.chat_bubble_outline, size: 16, color: Colors.grey.shade600),
                  const SizedBox(width: 4),
                  Text('${p['comments_count'] ?? 0}', style: const TextStyle(fontSize: 13)),
                ]),
              ),
            ),
          ]),
          // Comments
          if (_showComments) ...[
            const Divider(height: 16),
            if (_loadingComments)
              const Center(child: Padding(
                padding: EdgeInsets.all(8),
                child: CircularProgressIndicator(strokeWidth: 2))),
            ..._comments.map((c) {
              final ca = c['autor'] ?? {};
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  CircleAvatar(radius: 13,
                    backgroundColor: scheme.primary.withOpacity(0.1),
                    child: Text(
                      (ca['nome'] as String? ?? '?').isNotEmpty
                        ? (ca['nome'] as String)[0].toUpperCase() : '?',
                      style: TextStyle(fontSize: 11, color: scheme.primary, fontWeight: FontWeight.bold))),
                  const SizedBox(width: 8),
                  Expanded(child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                    decoration: BoxDecoration(
                      color: scheme.primary.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(8)),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(ca['nome'] ?? '',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      const SizedBox(height: 2),
                      Text(c['conteudo'] ?? '', style: const TextStyle(fontSize: 13)),
                    ]),
                  )),
                ]),
              );
            }),
            if (context.read<AuthService>().isAuthenticated)
              Row(children: [
                Expanded(child: TextField(
                  controller: _commentCtrl,
                  decoration: const InputDecoration(
                    hintText: 'Escreva um comentário…',
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                )),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: _sendingComment ? null : _sendComment,
                  icon: _sendingComment
                    ? const SizedBox(width: 18, height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : Icon(Icons.send, color: scheme.primary),
                ),
              ]),
          ],
        ]),
      ),
    );
  }
}
