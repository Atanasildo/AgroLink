import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<dynamic> _recentListings = [];
  List<dynamic> _prices = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        ApiService.getListings(),
        ApiService.getPrices(),
      ]);
      if (mounted) {
        setState(() {
          _recentListings = (results[0] as List).take(4).toList();
          _prices = (results[1] as List).take(5).toList();
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Row(children: [
          Icon(Icons.eco_rounded, color: scheme.primary),
          const SizedBox(width: 8),
          const Text('AgroLink', style: TextStyle(fontWeight: FontWeight.bold)),
        ]),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Saudação
                  _buildGreeting(auth, scheme),
                  const SizedBox(height: 24),

                  // Acesso rápido
                  _buildQuickActions(context, auth.userRole),
                  const SizedBox(height: 24),

                  // Preços do mercado
                  if (_prices.isNotEmpty) ...[
                    _buildSectionHeader('Preços do Mercado', context),
                    const SizedBox(height: 12),
                    _buildPricesRow(),
                    const SizedBox(height: 24),
                  ],

                  // Listagens recentes
                  if (_recentListings.isNotEmpty) ...[
                    _buildSectionHeader('Anúncios Recentes', context,
                      onMore: () => context.go('/marketplace')),
                    const SizedBox(height: 12),
                    ..._recentListings.map((l) => _buildListingCard(l, context)),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildGreeting(AuthService auth, ColorScheme scheme) {
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    final roleLabel = {
      'agricultor': 'Agricultor',
      'comprador': 'Comprador',
      'transportador': 'Transportador',
      'admin': 'Administrador',
    }[auth.userRole] ?? '';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.primary,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(children: [
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('$greeting, ${auth.userName.split(' ').first}!',
              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(roleLabel,
                style: const TextStyle(color: Colors.white, fontSize: 12)),
            ),
          ],
        )),
        Icon(Icons.eco_rounded, color: Colors.white.withOpacity(0.4), size: 48),
      ]),
    );
  }

  Widget _buildQuickActions(BuildContext context, String role) {
    final actions = <Map<String, dynamic>>[
      {'icon': Icons.storefront, 'label': 'Mercado', 'route': '/marketplace'},
      {'icon': Icons.local_shipping, 'label': 'Transporte', 'route': '/transporte'},
      {'icon': Icons.bar_chart, 'label': 'Preços', 'route': '/marketplace'},
      {'icon': Icons.person, 'label': 'Perfil', 'route': '/perfil'},
    ];

    return GridView.count(
      crossAxisCount: 4,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: actions.map((a) {
        final scheme = Theme.of(context).colorScheme;
        return InkWell(
          onTap: () => context.go(a['route'] as String),
          borderRadius: BorderRadius.circular(8),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: scheme.primary.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(a['icon'] as IconData, color: scheme.primary),
              ),
              const SizedBox(height: 6),
              Text(a['label'] as String,
                style: const TextStyle(fontSize: 11),
                textAlign: TextAlign.center),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildSectionHeader(String title, BuildContext context, {VoidCallback? onMore}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        if (onMore != null)
          TextButton(onPressed: onMore, child: const Text('Ver todos')),
      ],
    );
  }

  Widget _buildPricesRow() {
    return SizedBox(
      height: 80,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _prices.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final p = _prices[i];
          return Container(
            width: 120,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade200),
              borderRadius: BorderRadius.circular(8),
              color: Colors.white,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(p['produto'] ?? '', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  maxLines: 1, overflow: TextOverflow.ellipsis),
                Text('${_formatKz(p['preco_medio_kz'])} Kz/t',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.secondary)),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildListingCard(Map<String, dynamic> l, BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: ListTile(
        onTap: () => context.go('/marketplace/${l['id']}'),
        leading: Container(
          width: 48, height: 48,
          decoration: BoxDecoration(
            color: scheme.primary.withOpacity(0.08),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(Icons.grass, color: scheme.primary),
        ),
        title: Text(l['titulo'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text('${l['provincia'] ?? ''} · ${l['categoria'] ?? ''}',
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
        trailing: l['preco'] != null
            ? Text('${_formatKz(l['preco'])} Kz',
                style: TextStyle(fontWeight: FontWeight.bold, color: scheme.secondary))
            : null,
      ),
    );
  }

  String _formatKz(dynamic value) {
    if (value == null) return '—';
    final n = double.tryParse(value.toString()) ?? 0;
    return n.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]} ');
  }
}
