import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final scheme = Theme.of(context).colorScheme;

    final roleLabel = {
      'agricultor': '🌾 Agricultor',
      'comprador': '🛒 Comprador',
      'transportador': '🚛 Transportador',
      'admin': '⚙️ Administrador',
    }[auth.userRole] ?? auth.userRole;

    return Scaffold(
      appBar: AppBar(title: const Text('Perfil')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Avatar e info
          Center(
            child: Column(children: [
              CircleAvatar(
                radius: 40,
                backgroundColor: scheme.primary.withOpacity(0.1),
                child: Text(
                  auth.userName.isNotEmpty ? auth.userName[0].toUpperCase() : '?',
                  style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold,
                    color: scheme.primary),
                ),
              ),
              const SizedBox(height: 12),
              Text(auth.userName,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(auth.userEmail,
                style: TextStyle(color: Colors.grey.shade600)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: scheme.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(roleLabel,
                  style: TextStyle(color: scheme.primary, fontWeight: FontWeight.w600)),
              ),
            ]),
          ),
          const SizedBox(height: 32),

          // Opções
          _buildSection('Conta', [
            _buildTile(Icons.person_outline, 'Informações pessoais', () {}),
            _buildTile(Icons.lock_outline, 'Alterar palavra-passe', () {}),
            _buildTile(Icons.notifications_outlined, 'Notificações', () {}),
          ]),
          const SizedBox(height: 16),
          _buildSection('Suporte', [
            _buildTile(Icons.help_outline, 'Ajuda', () {}),
            _buildTile(Icons.info_outline, 'Sobre o AgroLink', () {}),
          ]),
          const SizedBox(height: 16),

          // Terminar sessão
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
              side: BorderSide(color: Colors.red.shade200),
            ),
            child: ListTile(
              onTap: () async {
                await auth.logout();
                if (context.mounted) context.go('/login');
              },
              leading: Icon(Icons.logout, color: Colors.red.shade600),
              title: Text('Terminar sessão',
                style: TextStyle(color: Colors.red.shade600, fontWeight: FontWeight.w600)),
            ),
          ),
          const SizedBox(height: 32),
          Center(child: Text('AgroLink v1.0.0',
            style: TextStyle(color: Colors.grey.shade400, fontSize: 12))),
        ],
      ),
    );
  }

  Widget _buildSection(String title, List<Widget> tiles) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.only(left: 4, bottom: 8),
        child: Text(title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13,
            color: Colors.grey)),
      ),
      Card(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: BorderSide(color: Colors.grey.shade200),
        ),
        child: Column(children: tiles),
      ),
    ]);
  }

  Widget _buildTile(IconData icon, String title, VoidCallback onTap) {
    return ListTile(
      onTap: onTap,
      leading: Icon(icon),
      title: Text(title),
      trailing: const Icon(Icons.chevron_right, size: 18),
    );
  }
}
