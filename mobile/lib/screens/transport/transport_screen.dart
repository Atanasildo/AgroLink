import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';

class TransportScreen extends StatefulWidget {
  const TransportScreen({super.key});

  @override
  State<TransportScreen> createState() => _TransportScreenState();
}

class _TransportScreenState extends State<TransportScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;
  List<dynamic> _requests = [];
  List<dynamic> _routes = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final token = context.read<AuthService>().token!;
    try {
      final results = await Future.wait([
        ApiService.myTransportRequests(token),
        ApiService.searchRoutes(),
      ]);
      if (mounted) {
        setState(() {
          _requests = results[0] as List;
          _routes = results[1] as List;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Transporte'),
        bottom: TabBar(
          controller: _tabs,
          tabs: const [
            Tab(text: 'As minhas solicitações'),
            Tab(text: 'Rotas disponíveis'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabs,
              children: [
                _buildRequests(),
                _buildRoutes(),
              ],
            ),
    );
  }

  Widget _buildRequests() {
    if (_requests.isEmpty) {
      return const Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.local_shipping_outlined, size: 48, color: Colors.grey),
          SizedBox(height: 12),
          Text('Ainda não fizeste nenhuma solicitação'),
        ]),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _requests.length,
        itemBuilder: (_, i) => _buildRequestCard(_requests[i]),
      ),
    );
  }

  Widget _buildRequestCard(Map<String, dynamic> r) {
    final scheme = Theme.of(context).colorScheme;
    final statusConfig = {
      'pendente': (Colors.orange, 'Pendente', Icons.hourglass_empty),
      'aceite':   (Colors.blue,   'Aceite',   Icons.thumb_up_outlined),
      'em_andamento': (scheme.primary, 'Em andamento', Icons.local_shipping),
      'concluido': (Colors.green,  'Concluído', Icons.check_circle_outline),
      'cancelado': (Colors.red,    'Cancelado', Icons.cancel_outlined),
    };
    final cfg = statusConfig[r['status']] ?? (Colors.grey, r['status'], Icons.info_outline);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('${r['origem']} → ${r['destino']}',
                style: const TextStyle(fontWeight: FontWeight.bold)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: (cfg.$1 as Color).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(cfg.$3 as IconData, size: 12, color: cfg.$1 as Color),
                  const SizedBox(width: 4),
                  Text(cfg.$2 as String,
                    style: TextStyle(fontSize: 11, color: cfg.$1 as Color,
                      fontWeight: FontWeight.w600)),
                ]),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text('${r['produto']} · ${r['peso_toneladas']}t · ${r['data']?.substring(0, 10) ?? ''}',
            style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
          if (r['status'] == 'em_andamento') ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => context.go('/transporte/rastrear/${r['id']}'),
                icon: const Icon(Icons.map_outlined, size: 16),
                label: const Text('Rastrear em tempo real'),
              ),
            ),
          ],
        ]),
      ),
    );
  }

  Widget _buildRoutes() {
    if (_routes.isEmpty) {
      return const Center(child: Text('Nenhuma rota disponível'));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _routes.length,
        itemBuilder: (_, i) => _buildRouteCard(_routes[i]),
      ),
    );
  }

  Widget _buildRouteCard(Map<String, dynamic> r) {
    final scheme = Theme.of(context).colorScheme;
    final dispTons = double.tryParse(r['capacidade_disponivel_toneladas']?.toString() ?? '0') ?? 0;
    final full = dispTons <= 0;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('${r['origem']} → ${r['destino']}',
                style: const TextStyle(fontWeight: FontWeight.bold)),
              Text('${_fmtKz(r['preco_por_tonelada'])} Kz/t',
                style: TextStyle(color: scheme.secondary, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 6),
          Text('📅 ${r['data']?.substring(0, 10) ?? ''}  ·  ⚖️ ${dispTons}t disponíveis',
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
          const SizedBox(height: 10),
          if (!full)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => _showRequestDialog(r),
                child: const Text('Solicitar transporte'),
              ),
            )
          else
            Text('Capacidade esgotada', style: TextStyle(color: Colors.red.shade400, fontSize: 13)),
        ]),
      ),
    );
  }

  Future<void> _showRequestDialog(Map<String, dynamic> route) async {
    final produtoCtrl = TextEditingController();
    final pesoCtrl = TextEditingController();
    final dataCtrl = TextEditingController(
        text: route['data']?.substring(0, 10) ?? '');
    final formKey = GlobalKey<FormState>();
    bool loading = false;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) => Padding(
          padding: EdgeInsets.fromLTRB(16, 16, 16,
            MediaQuery.of(ctx).viewInsets.bottom + 16),
          child: Form(
            key: formKey,
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text('Solicitar: ${route['origem']} → ${route['destino']}',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 16),
              TextFormField(
                controller: produtoCtrl,
                decoration: const InputDecoration(labelText: 'Produto'),
                validator: (v) => v!.isEmpty ? 'Obrigatório' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: pesoCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Peso (toneladas)'),
                validator: (v) => (double.tryParse(v ?? '') == null) ? 'Valor inválido' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: dataCtrl,
                decoration: const InputDecoration(labelText: 'Data (AAAA-MM-DD)'),
                validator: (v) => v!.isEmpty ? 'Obrigatório' : null,
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: loading ? null : () async {
                    if (!formKey.currentState!.validate()) return;
                    setModal(() => loading = true);
                    final token = context.read<AuthService>().token!;
                    try {
                      await ApiService.createTransportRequest(
                        token: token,
                        produto: produtoCtrl.text,
                        pesoToneladas: double.parse(pesoCtrl.text),
                        origem: route['origem'],
                        destino: route['destino'],
                        data: dataCtrl.text,
                        rotaId: route['id'],
                      );
                      if (mounted) {
                        Navigator.pop(ctx);
                        _load();
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Solicitação enviada com sucesso!')));
                      }
                    } catch (e) {
                      setModal(() => loading = false);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(e.toString())));
                    }
                  },
                  child: loading
                      ? const SizedBox(height: 20, width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Confirmar solicitação'),
                ),
              ),
            ]),
          ),
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
