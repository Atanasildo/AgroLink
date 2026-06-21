import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/auth_service.dart';
import 'router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final authService = AuthService();
  await authService.init();

  runApp(
    ChangeNotifierProvider.value(
      value: authService,
      child: const AgroLinkApp(),
    ),
  );
}

class AgroLinkApp extends StatelessWidget {
  const AgroLinkApp({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();

    return MaterialApp.router(
      title: 'AgroLink',
      debugShowCheckedModeBanner: false,
      theme: _buildTheme(),
      routerConfig: buildRouter(authService),
    );
  }

  ThemeData _buildTheme() {
    const fieldGreen = Color(0xFF1a7a3c);
    const harvest = Color(0xFFb3541e);
    const ink = Color(0xFF1a1a0e);
    const canvas = Color(0xFFF9F6EF);

    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: fieldGreen,
        primary: fieldGreen,
        secondary: harvest,
        surface: canvas,
        onSurface: ink,
      ),
      scaffoldBackgroundColor: canvas,
      fontFamily: 'Geist',
      appBarTheme: const AppBarTheme(
        backgroundColor: canvas,
        foregroundColor: ink,
        elevation: 0,
        centerTitle: false,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: fieldGreen,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide: BorderSide(color: fieldGreen.withOpacity(0.3)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide: const BorderSide(color: fieldGreen),
        ),
        filled: true,
        fillColor: Colors.white,
      ),
    );
  }
}
