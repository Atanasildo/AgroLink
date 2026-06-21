import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/api_service.dart';
import '../../utils/provincias.dart';

class MarketplaceScreen extends StatefulWidget {
  const MarketplaceScreen({super.key});

  @override
  State<MarketplaceScreen> createState() => _MarketplaceScreenState();
}

class _MarketplaceScreenState extends State<MarketplaceScreen> {
  List<dynamic> _listings = [];
  bool _loading = true;
  String _search = '';
  String? _provinciaFilter;
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiService.getListings(
        search: _search.isEmpty ? null : _search,
        provincia: _provinciaFilter,
      );
      if (mounted) setState(() { _listings = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Mercado')),
      body: Column(
        children: [
          // Barra de pesquisa
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: 'Pesquisar produtos...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _search.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _search = '');
                          _load();
                        },
                      )
                    : null,
              ),
              onSubmitted: (v) {
                setState(() => _search = v);
                _load();
              },
            ),
          ),

          // Filtro de província
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              children: [
                _buildFilterChip('Todas', null, scheme),
                ...kProvincias.map((p) => _buildFilterChip(p, p, scheme)),
              ],
            ),
          ),

          // Lista
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _listings.isEmpty
                    ? const Center(child: Text('Nenhum anúncio encontrado'))
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _listings.length,
                          itemBuilder: (_, i) => _buildCard(_listings[i], context),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String? value, ColorScheme scheme) {
    final selected = _provinciaFilter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) {
          setState(() => _provinciaFilter = value);
          _load();
        },
        selectedColor: scheme.primary.withOpacity(0.15),
        checkmarkColor: scheme.primary,
      ),
    );
  }

  Widget _buildCard(Map<String, dynamic> l, BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: InkWell(
        onTap: () => context.go('/marketplace/${l['id']}'),
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(children: [
            Container(
              width: 64, height: 64,
              decoration: BoxDecoration(
                color: scheme.primary.withOpacity(0.08),
                borderRadius: BorderRadius.circular(8),
              ),
              child: l['imagem_url'] != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(l['imagem_url'], fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Icon(Icons.grass, color: scheme.primary)))
                  : Icon(Icons.grass, color: scheme.primary),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l['titulo'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text('${l['provincia'] ?? ''} · ${l['categoria'] ?? ''}',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                if (l['quantidade'] != null) ...[
                  const SizedBox(height: 2),
                  Text('${l['quantidade']} ${l['unidade'] ?? ''}',
                    style: const TextStyle(fontSize: 12)),
                ],
              ],
            )),
            if (l['preco'] != null)
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text('${_fmtKz(l['preco'])}',
                  style: TextStyle(fontWeight: FontWeight.bold, color: scheme.secondary)),
                Text(' Kz', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              ]),
          ]),
        ),
      ),
    );
  }

  String _fmtKz(dynamic v) {
    final n = double.tryParse(v.toString()) ?? 0;
    return n.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]} ');
  }
}
