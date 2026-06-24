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
import 'screens/machines/machines_screen.dart';
import 'screens/prices/prices_screen.dart';
import 'screens/social/social_screen.dart';
import 'screens/chat/chat_screen.dart';
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
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
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
          GoRoute(path: '/maquinas', builder: (_, __) => const MachinesScreen()),
          GoRoute(path: '/precos', builder: (_, __) => const PricesScreen()),
          GoRoute(path: '/comunidade', builder: (_, __) => const SocialScreen()),
          GoRoute(path: '/chat', builder: (_, __) => const ChatScreen()),
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
    final loc = GoRouterState.of(context).matchedLocation;
    if (loc.startsWith('/marketplace')) return 1;
    if (loc.startsWith('/transporte')) return 2;
    if (loc.startsWith('/maquinas')) return 3;
    if (loc.startsWith('/precos')) return 4;
    if (loc.startsWith('/comunidade')) return 5;
    if (loc.startsWith('/chat')) return 6;
    if (loc.startsWith('/perfil')) return 7;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = _locationToIndex(context);

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex > 3 ? 3 : currentIndex, // clamp for display
        onDestinationSelected: (index) {
          switch (index) {
            case 0: context.go('/'); break;
            case 1: context.go('/marketplace'); break;
            case 2: context.go('/transporte'); break;
            case 3: _showMoreSheet(context); break;
          }
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Início',
          ),
          NavigationDestination(
            icon: Icon(Icons.storefront_outlined),
            selectedIcon: Icon(Icons.storefront),
            label: 'Mercado',
          ),
          NavigationDestination(
            icon: Icon(Icons.local_shipping_outlined),
            selectedIcon: Icon(Icons.local_shipping),
            label: 'Transporte',
          ),
          NavigationDestination(
            icon: Icon(Icons.grid_view_rounded),
            selectedIcon: Icon(Icons.grid_view_rounded),
            label: 'Mais',
          ),
        ],
      ),
    );
  }

  void _showMoreSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => _MoreSheet(),
    );
  }
}

class _MoreSheet extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final items = [
      {'icon': Icons.agriculture_outlined, 'label': 'Máquinas', 'route': '/maquinas'},
      {'icon': Icons.trending_up_rounded, 'label': 'Preços', 'route': '/precos'},
      {'icon': Icons.people_alt_outlined, 'label': 'Comunidade', 'route': '/comunidade'},
      {'icon': Icons.chat_bubble_outline_rounded, 'label': 'Mensagens', 'route': '/chat'},
      {'icon': Icons.person_outline_rounded, 'label': 'Perfil', 'route': '/perfil'},
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 36, height: 4, margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 4,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          children: items.map((item) {
            return InkWell(
              onTap: () {
                Navigator.pop(context);
                context.go(item['route'] as String);
              },
              borderRadius: BorderRadius.circular(12),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: scheme.primary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12)),
                  child: Icon(item['icon'] as IconData, color: scheme.primary, size: 24),
                ),
                const SizedBox(height: 6),
                Text(item['label'] as String,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500)),
              ]),
            );
          }).toList(),
        ),
      ]),
    );
  }
}
