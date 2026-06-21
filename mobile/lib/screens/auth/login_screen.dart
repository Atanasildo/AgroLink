import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/api_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });

    try {
      await context.read<AuthService>().login(_emailCtrl.text.trim(), _passCtrl.text);
      if (mounted) context.go('/');
    } on ApiException catch (e) {
      setState(() => _error = e.statusCode == 401
          ? 'Email ou palavra-passe incorretos.'
          : e.message);
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
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo / marca
                  const SizedBox(height: 32),
                  Icon(Icons.eco_rounded, size: 56, color: scheme.primary),
                  const SizedBox(height: 12),
                  Text('AgroLink',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: scheme.primary,
                    )),
                  Text('Plataforma Agrícola Angolana',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: scheme.onSurface.withOpacity(0.55),
                    )),
                  const SizedBox(height: 48),

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
                    textInputAction: TextInputAction.done,
                    onFieldSubmitted: (_) => _submit(),
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
                  const SizedBox(height: 8),

                  // Erro
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(_error!,
                        style: TextStyle(color: scheme.error, fontSize: 13),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  const SizedBox(height: 24),

                  // Botão entrar
                  ElevatedButton(
                    onPressed: _loading ? null : _submit,
                    child: _loading
                        ? const SizedBox(height: 20, width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Entrar'),
                  ),
                  const SizedBox(height: 16),

                  // Registo
                  TextButton(
                    onPressed: () => context.go('/register'),
                    child: RichText(
                      text: TextSpan(
                        style: Theme.of(context).textTheme.bodyMedium,
                        children: [
                          const TextSpan(text: 'Não tens conta? '),
                          TextSpan(text: 'Registar', style: TextStyle(
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
      ),
    );
  }
}
