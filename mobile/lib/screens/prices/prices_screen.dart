import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../utils/provincias.dart';

const List<Map<String, String>> _produtos = [
  {'value': 'milho',      'label': 'Milho',      'emoji': '🌽'},
  {'value': 'feijao',     'label': 'Feijão',     'emoji': '🫘'},
  {'value': 'mandioca',   'label': 'Mandioca',   'emoji': '🥔'},
  {'value': 'soja',       'label': 'Soja',       'emoji': '🌱'},
  {'value': 'hortalicas', 'label': 'Hortaliças', 'emoji': '🥬'},
];

enum PriceTab { latest, compare, history }

class PricesScreen extends StatefulWidget {
  const PricesScreen({super.key});
  @override
  State<PricesScreen> createState() => _PricesScreenState();
}

class _PricesScreenState extends State<PricesScreen> {
  PriceTab _tab = PriceTab.latest;
  String _produto = 'milho';
  String? _provincia;
  List<dynamic> _records = [];
  bool _loading = false;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      List<dynamic> data;
      if (_tab == PriceTab.latest) {
        data = await ApiService.getLatestPrices(produto: _produto, provincia: _provincia);
      } else if (_tab == PriceTab.compare) {
        data = await ApiService.comparePrices(produto: _produto);
      } else {
        data = await ApiService.getPriceHistory(produto: _produto, provincia: _provincia);
      }
      if (mounted) setState(() { _records = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _fmtKz(dynamic v) {
    final n = double.tryParse(v.toString()) ?? 0;
    return n.toStringAsFixed(2);
  }

  String _emoji(String p) => _produtos.firstWhere(
    (x) => x['value'] == p, orElse: () => {'emoji': '📦'})['emoji']!;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Preços Agrícolas')),
      body: Column(children: [
        // Tab bar
        Container(
          color: Theme.of(context).scaffoldBackgroundColor,
          child: Row(children: [
            _tab_(PriceTab.latest, '📊 Actuais', scheme),
            _tab_(PriceTab.compare, '🗺️ Regiões', scheme),
            _tab_(PriceTab.history, '📈 Histórico', scheme),
          ]),
        ),
        const Divider(height: 1),
        // Produto chips
        SizedBox(
          height: 48,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            children: _produtos.map((p) {
              final sel = _produto == p['value'];
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: FilterChip(
                  label: Text('${p['emoji']} ${p['label']}'),
                  selected: sel,
                  onSelected: (_) { setState(() => _produto = p['value']!); _load(); },
                  selectedColor: scheme.primary.withOpacity(0.15),
                  checkmarkColor: scheme.primary,
                ),
              );
            }).toList(),
          ),
        ),
        // Província filter (latest + history only)
        if (_tab != PriceTab.compare)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: DropdownButtonFormField<String>(
              value: _provincia,
              decoration: const InputDecoration(
                labelText: 'Província',
                isDense: true,
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
              items: [
                const DropdownMenuItem(value: null, child: Text('Todas as províncias')),
                ...kProvincias.map((p) => DropdownMenuItem(value: p, child: Text(p))),
              ],
              onChanged: (v) { setState(() => _provincia = v); _load(); },
            ),
          ),
        const SizedBox(height: 4),
        // Content
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _records.isEmpty
                  ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.trending_up_outlined, size: 48, color: Colors.grey.shade400),
                      const SizedBox(height: 12),
                      const Text('Sem registos de preços'),
                    ]))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: _buildList(scheme),
                    ),
        ),
      ]),
    );
  }

  Widget _tab_(PriceTab t, String label, ColorScheme scheme) {
    final sel = _tab == t;
    return Expanded(child: InkWell(
      onTap: () { setState(() => _tab = t); _load(); },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(
            color: sel ? scheme.primary : Colors.transparent, width: 2)),
        ),
        child: Text(label, textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
            color: sel ? scheme.primary : Colors.grey.shade600)),
      ),
    ));
  }

  Widget _buildList(ColorScheme scheme) {
    if (_tab == PriceTab.compare) {
      final maxP = _records.fold<double>(0, (m, r) => r['preco_kg'] > m ? double.parse(r['preco_kg'].toString()) : m);
      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _records.length,
        itemBuilder: (_, i) {
          final r = _records[i];
          final pct = maxP > 0 ? double.parse(r['preco_kg'].toString()) / maxP : 0.0;
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(children: [
              SizedBox(width: 90, child: Text(r['provincia'] ?? '', textAlign: TextAlign.right,
                style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis)),
              const SizedBox(width: 8),
              Expanded(child: Stack(children: [
                Container(height: 28, decoration: BoxDecoration(
                  color: scheme.primary.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(4))),
                FractionallySizedBox(
                  widthFactor: pct,
                  child: Container(height: 28, decoration: BoxDecoration(
                    color: scheme.primary.withOpacity(0.35),
                    borderRadius: BorderRadius.circular(4)))),
                Positioned.fill(child: Align(alignment: Alignment.centerLeft,
                  child: Padding(padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Text('${_fmtKz(r['preco_kg'])} Kz',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold,
                        color: scheme.primary))))),
              ])),
            ]),
          );
        },
      );
    }

    if (_tab == PriceTab.history) {
      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _records.length,
        itemBuilder: (_, i) {
          final r = _records[i];
          return ListTile(
            leading: Text(_emoji(r['produto'] ?? ''), style: const TextStyle(fontSize: 22)),
            title: Text('${_fmtKz(r['preco_kg'])} Kz/kg',
              style: TextStyle(fontWeight: FontWeight.bold, color: scheme.primary)),
            subtitle: Text(r['provincia'] ?? ''),
            trailing: Text(
              (r['criado_em'] as String?)?.substring(0, 10) ?? '',
              style: const TextStyle(fontSize: 11, color: Colors.grey)),
            dense: true,
          );
        },
      );
    }

    // Latest — cards grid
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.2),
      itemCount: _records.length,
      itemBuilder: (_, i) {
        final r = _records[i];
        return Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: BorderSide(color: scheme.primary.withOpacity(0.2))),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(_emoji(r['produto'] ?? ''), style: const TextStyle(fontSize: 28)),
              const Spacer(),
              Text('${_fmtKz(r['preco_kg'])} Kz',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: scheme.primary)),
              Text('por kg', style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
              const SizedBox(height: 4),
              Row(children: [
                Icon(Icons.location_on_outlined, size: 11, color: scheme.primary),
                const SizedBox(width: 2),
                Expanded(child: Text(r['provincia'] ?? '',
                  style: const TextStyle(fontSize: 11), overflow: TextOverflow.ellipsis)),
              ]),
            ]),
          ),
        );
      },
    );
  }
}
