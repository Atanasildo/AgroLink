import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';

class AuthService extends ChangeNotifier {
  String? _token;
  Map<String, dynamic>? _user;

  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  bool get isAuthenticated => _token != null;
  String get userName => _user?['nome'] ?? '';
  String get userRole => _user?['role'] ?? '';
  String get userEmail => _user?['email'] ?? '';

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
    if (_token != null) {
      try {
        _user = await ApiService.me(_token!);
      } catch (_) {
        // Token expirado ou inválido
        await _clearSession();
      }
    }
  }

  Future<void> login(String email, String password) async {
    final data = await ApiService.login(email, password);
    _token = data['access_token'];
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', _token!);
    _user = await ApiService.me(_token!);
    notifyListeners();
  }

  Future<void> register({
    required String nome,
    required String email,
    required String password,
    required String role,
    required String provincia,
  }) async {
    await ApiService.register(
      nome: nome,
      email: email,
      password: password,
      role: role,
      provincia: provincia,
    );
    await login(email, password);
  }

  Future<void> logout() async {
    await _clearSession();
    notifyListeners();
  }

  Future<void> _clearSession() async {
    _token = null;
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
  }
}
