import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../utils/provincias.dart';

const Map<String, String> _roleLabels = {
  'agricultor': '🌾 Agricultor',
  'comprador': '🛒 Comprador',
  'transportador': '🚛 Transportador',
  'proprietario_maquinas': '🚜 Proprietário de Máquinas',
  'admin': '⚙️ Administrador',
};

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> with SingleTickerProviderStateMixin {
  late TabController _tab;

  @override
  void initState() { super.initState(); _tab = TabController(length: 2, vsync: this); }
  @override
  void dispose() { _tab.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final scheme = Theme.of(context).colorScheme;

    if (!auth.isAuthenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Perfil')),
        body: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.person_outline, size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          const Text('Entre para ver o seu perfil', style: TextStyle(fontSize: 16)),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pushNamed('/login'),
            child: const Text('Entrar'),
          ),
        ])),
      );
    }

    final user = auth.user!;
    final initials = (user['nome'] as String? ?? 'U').isNotEmpty
        ? (user['nome'] as String)[0].toUpperCase() : 'U';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Perfil'),
        actions: [
          TextButton.icon(
            onPressed: () async {
              final confirmed = await showDialog<bool>(context: context,
                builder: (_) => AlertDialog(
                  title: const Text('Terminar sessão'),
                  content: const Text('Tem a certeza que quer sair?'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
                    TextButton(onPressed: () => Navigator.pop(context, true),
                      child: const Text('Sair', style: TextStyle(color: Colors.red))),
                  ],
                ));
              if (confirmed == true && context.mounted) await context.read<AuthService>().logout();
            },
            icon: const Icon(Icons.logout, size: 16),
            label: const Text('Sair'),
          ),
        ],
        bottom: TabBar(
          controller: _tab,
          labelColor: scheme.primary,
          indicatorColor: scheme.primary,
          tabs: const [
            Tab(text: 'Informações'),
            Tab(text: 'Segurança'),
          ],
        ),
      ),
      body: Column(children: [
        // Avatar section
        Container(
          padding: const EdgeInsets.symmetric(vertical: 20),
          color: scheme.primary.withOpacity(0.05),
          child: Center(child: Column(children: [
            CircleAvatar(
              radius: 40,
              backgroundColor: scheme.primary.withOpacity(0.2),
              child: Text(initials, style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold,
                color: scheme.primary)),
            ),
            const SizedBox(height: 12),
            Text(user['nome'] ?? '',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(_roleLabels[user['role']] ?? user['role'] ?? '',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
          ])),
        ),
        Expanded(child: TabBarView(controller: _tab, children: [
          _EditInfoTab(user: user),
          const _ChangePasswordTab(),
        ])),
      ]),
    );
  }
}

class _EditInfoTab extends StatefulWidget {
  final Map<String, dynamic> user;
  const _EditInfoTab({required this.user});
  @override
  State<_EditInfoTab> createState() => _EditInfoTabState();
}

class _EditInfoTabState extends State<_EditInfoTab> {
  late final _nomeCtrl = TextEditingController(text: widget.user['nome'] ?? '');
  late final _telCtrl = TextEditingController(text: widget.user['telefone'] ?? '');
  late final _bioCtrl = TextEditingController(text: widget.user['bio'] ?? '');
  String? _provincia;
  bool _saving = false;
  String? _success;
  String? _error;

  @override
  void initState() {
    super.initState();
    _provincia = widget.user['provincia'];
  }

  @override
  void dispose() { _nomeCtrl.dispose(); _telCtrl.dispose(); _bioCtrl.dispose(); super.dispose(); }

  Future<void> _save() async {
    setState(() { _saving = true; _error = null; _success = null; });
    final token = context.read<AuthService>().token!;
    try {
      await ApiService.updateProfile(token,
        nome: _nomeCtrl.text.trim(),
        telefone: _telCtrl.text.trim(),
        provincia: _provincia,
        bio: _bioCtrl.text.trim(),
      );
      if (mounted) setState(() => _success = 'Perfil actualizado com sucesso!');
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Email', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        TextField(
          enabled: false,
          decoration: InputDecoration(
            hintText: context.read<AuthService>().userEmail,
            prefixIcon: const Icon(Icons.email_outlined),
            fillColor: Colors.grey.shade100),
        ),
        const SizedBox(height: 16),
        const Text('Nome', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        TextField(
          controller: _nomeCtrl,
          decoration: const InputDecoration(prefixIcon: Icon(Icons.person_outline)),
        ),
        const SizedBox(height: 16),
        const Text('Telefone', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        TextField(
          controller: _telCtrl,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(prefixIcon: Icon(Icons.phone_outlined)),
        ),
        const SizedBox(height: 16),
        const Text('Província', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          value: _provincia,
          decoration: const InputDecoration(prefixIcon: Icon(Icons.location_on_outlined)),
          items: [
            const DropdownMenuItem(value: null, child: Text('Selecionar…')),
            ...kProvincias.map((p) => DropdownMenuItem(value: p, child: Text(p))),
          ],
          onChanged: (v) => setState(() => _provincia = v),
        ),
        const SizedBox(height: 16),
        const Text('Sobre mim', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        TextField(
          controller: _bioCtrl,
          maxLines: 3,
          decoration: const InputDecoration(hintText: 'Conte um pouco sobre si…'),
        ),
        const SizedBox(height: 24),
        if (_success != null) Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(_success!, style: TextStyle(color: scheme.primary, fontWeight: FontWeight.w600))),
        if (_error != null) Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(_error!, style: const TextStyle(color: Colors.red))),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _saving ? null : _save,
            child: _saving
              ? const SizedBox(height: 20, width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Guardar alterações'),
          ),
        ),
      ]),
    );
  }
}

class _ChangePasswordTab extends StatefulWidget {
  const _ChangePasswordTab();
  @override
  State<_ChangePasswordTab> createState() => _ChangePasswordTabState();
}

class _ChangePasswordTabState extends State<_ChangePasswordTab> {
  final _atualCtrl = TextEditingController();
  final _novaCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _saving = false;
  String? _success;
  String? _error;
  bool _showAtual = false, _showNova = false, _showConfirm = false;

  @override
  void dispose() { _atualCtrl.dispose(); _novaCtrl.dispose(); _confirmCtrl.dispose(); super.dispose(); }

  Future<void> _change() async {
    setState(() { _error = null; _success = null; });
    if (_novaCtrl.text != _confirmCtrl.text) {
      setState(() => _error = 'As palavras-passe não coincidem.'); return;
    }
    if (_novaCtrl.text.length < 8) {
      setState(() => _error = 'A nova palavra-passe deve ter pelo menos 8 caracteres.'); return;
    }
    setState(() => _saving = true);
    final token = context.read<AuthService>().token!;
    try {
      await ApiService.changePassword(token, _atualCtrl.text, _novaCtrl.text);
      _atualCtrl.clear(); _novaCtrl.clear(); _confirmCtrl.clear();
      if (mounted) setState(() => _success = 'Palavra-passe alterada com sucesso!');
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Palavra-passe actual',
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        TextField(
          controller: _atualCtrl,
          obscureText: !_showAtual,
          decoration: InputDecoration(
            prefixIcon: const Icon(Icons.lock_outline),
            suffixIcon: IconButton(
              icon: Icon(_showAtual ? Icons.visibility_off : Icons.visibility),
              onPressed: () => setState(() => _showAtual = !_showAtual))),
        ),
        const SizedBox(height: 16),
        const Text('Nova palavra-passe',
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        TextField(
          controller: _novaCtrl,
          obscureText: !_showNova,
          decoration: InputDecoration(
            prefixIcon: const Icon(Icons.lock_outline),
            suffixIcon: IconButton(
              icon: Icon(_showNova ? Icons.visibility_off : Icons.visibility),
              onPressed: () => setState(() => _showNova = !_showNova))),
        ),
        const SizedBox(height: 16),
        const Text('Confirmar nova palavra-passe',
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        TextField(
          controller: _confirmCtrl,
          obscureText: !_showConfirm,
          decoration: InputDecoration(
            prefixIcon: const Icon(Icons.lock_outline),
            suffixIcon: IconButton(
              icon: Icon(_showConfirm ? Icons.visibility_off : Icons.visibility),
              onPressed: () => setState(() => _showConfirm = !_showConfirm))),
        ),
        const SizedBox(height: 24),
        if (_success != null) Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(_success!, style: TextStyle(color: scheme.primary, fontWeight: FontWeight.w600))),
        if (_error != null) Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(_error!, style: const TextStyle(color: Colors.red))),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _saving ? null : _change,
            child: _saving
              ? const SizedBox(height: 20, width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Alterar palavra-passe'),
          ),
        ),
      ]),
    );
  }
}
