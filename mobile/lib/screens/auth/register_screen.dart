import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/api_service.dart';
import '../../utils/provincias.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nomeCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  String _role = 'agricultor';
  String _provincia = 'Luanda';
  bool _loading = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _nomeCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });

    try {
      await context.read<AuthService>().register(
        nome: _nomeCtrl.text.trim(),
        email: _emailCtrl.text.trim(),
        password: _passCtrl.text,
        role: _role,
        provincia: _provincia,
      );
      if (mounted) context.go('/');
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Não foi possível ligar ao servidor. Verifica a ligação.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Criar conta')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Nome
                TextFormField(
                  controller: _nomeCtrl,
                  textCapitalization: TextCapitalization.words,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Nome completo',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                  validator: (v) => (v == null || v.trim().length < 3)
                      ? 'Mínimo 3 caracteres'
                      : null,
                ),
                const SizedBox(height: 16),

                // Email
                TextFormField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                  validator: (v) => (v == null || !v.contains('@'))
                      ? 'Introduz um email válido'
                      : null,
                ),
                const SizedBox(height: 16),

                // Password
                TextFormField(
                  controller: _passCtrl,
                  obscureText: _obscure,
                  textInputAction: TextInputAction.next,
                  decoration: InputDecoration(
                    labelText: 'Palavra-passe',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                      onPressed: () => setState(() => _obscure = !_obscure),
                    ),
                  ),
                  validator: (v) => (v == null || v.length < 6)
                      ? 'Mínimo 6 caracteres'
                      : null,
                ),
                const SizedBox(height: 16),

                // Tipo de conta
                DropdownButtonFormField<String>(
                  value: _role,
                  decoration: const InputDecoration(
                    labelText: 'Tipo de conta',
                    prefixIcon: Icon(Icons.badge_outlined),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'agricultor', child: Text('Agricultor')),
                    DropdownMenuItem(value: 'comprador', child: Text('Comprador')),
                    DropdownMenuItem(value: 'transportador', child: Text('Transportador')),
                  ],
                  onChanged: (v) => setState(() => _role = v!),
                ),
                const SizedBox(height: 16),

                // Província
                DropdownButtonFormField<String>(
                  value: _provincia,
                  decoration: const InputDecoration(
                    labelText: 'Província',
                    prefixIcon: Icon(Icons.location_on_outlined),
                  ),
                  items: kProvincias
                      .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                      .toList(),
                  onChanged: (v) => setState(() => _provincia = v!),
                ),
                const SizedBox(height: 8),

                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(_error!,
                      style: TextStyle(color: scheme.error, fontSize: 13),
                      textAlign: TextAlign.center,
                    ),
                  ),
                const SizedBox(height: 24),

                ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(height: 20, width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Criar conta'),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => context.go('/login'),
                  child: RichText(
                    text: TextSpan(
                      style: Theme.of(context).textTheme.bodyMedium,
                      children: [
                        const TextSpan(text: 'Já tens conta? '),
                        TextSpan(text: 'Entrar', style: TextStyle(
                          color: scheme.primary,
                          fontWeight: FontWeight.bold,
                        )),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
