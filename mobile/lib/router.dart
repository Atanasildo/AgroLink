import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'services/auth_service.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/home/home_screen.dart';
import 'screens/marketplace/marketplace_screen.dart';
import 'screens/marketplace/listing_detail_screen.dart';
import 'screens/transport/transport_screen.dart';
import 'screens/transport/tracking_screen.dart';
import 'screens/profile/profile_screen.dart';

GoRouter buildRouter(AuthService auth) {
  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final loggedIn = auth.isAuthenticated;
      final onAuth = state.matchedLocation.startsWith('/login') ||
          state.matchedLocation.startsWith('/register');

      if (!loggedIn && !onAuth) return '/login';
      if (loggedIn && onAuth) return '/';
      return null;
    },
    refreshListenable: auth,
    routes: [
      // Auth
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),

      // App principal com bottom nav
      ShellRoute(
        builder: (context, state, child) => HomeShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
          GoRoute(
            path: '/marketplace',
            builder: (_, __) => const MarketplaceScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (_, state) =>
                    ListingDetailScreen(id: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(
            path: '/transporte',
            builder: (_, __) => const TransportScreen(),
            routes: [
              GoRoute(
                path: 'rastrear/:requestId',
                builder: (_, state) =>
                    TrackingScreen(requestId: state.pathParameters['requestId']!),
              ),
            ],
          ),
          GoRoute(path: '/perfil', builder: (_, __) => const ProfileScreen()),
        ],
      ),
    ],
  );
}

class HomeShell extends StatelessWidget {
  final Widget child;
  const HomeShell({super.key, required this.child});

  int _locationToIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/marketplace')) return 1;
    if (location.startsWith('/transporte')) return 2;
    if (location.startsWith('/perfil')) return 3;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = _locationToIndex(context);

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: (index) {
          switch (index) {
            case 0: context.go('/'); break;
            case 1: context.go('/marketplace'); break;
            case 2: context.go('/transporte'); break;
            case 3: context.go('/perfil'); break;
          }
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Início'),
          NavigationDestination(icon: Icon(Icons.storefront_outlined), selectedIcon: Icon(Icons.storefront), label: 'Mercado'),
          NavigationDestination(icon: Icon(Icons.local_shipping_outlined), selectedIcon: Icon(Icons.local_shipping), label: 'Transporte'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Perfil'),
        ],
      ),
    );
  }
}
