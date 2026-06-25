import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../utils/provincias.dart';

const Map<String, String> _tipoLabels = {
  'trator': '🚜 Trator',
  'colheitadeira': '🌾 Colheitadeira',
  'arado': '🔧 Arado',
  'plantadora': '🌱 Plantadora',
  'irrigacao': '💧 Irrigação',
  'outros': '⚙️ Outros',
};

class MachinesScreen extends StatefulWidget {
  const MachinesScreen({super.key});
  @override
  State<MachinesScreen> createState() => _MachinesScreenState();
}

class _MachinesScreenState extends State<MachinesScreen> {
  List<dynamic> _machines = [];
  bool _loading = true;
  String? _provinciaFilter;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiService.getMachines(provincia: _provinciaFilter);
      if (mounted) setState(() { _machines = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Máquinas Agrícolas')),
      body: Column(children: [
        SizedBox(
          height: 48,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            children: [
              _chip('Todas', null, scheme),
              ...kProvincias.map((p) => _chip(p, p, scheme)),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _machines.isEmpty
                  ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.agriculture_outlined, size: 48, color: Colors.grey.shade400),
                      const SizedBox(height: 12),
                      const Text('Nenhuma máquina encontrada'),
                      TextButton(onPressed: _load, child: const Text('Tentar novamente')),
                    ]))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _machines.length,
                        itemBuilder: (_, i) => _MachineCard(machine: _machines[i]),
                      ),
                    ),
        ),
      ]),
    );
  }

  Widget _chip(String label, String? value, ColorScheme scheme) {
    final selected = _provinciaFilter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label), selected: selected,
        onSelected: (_) { setState(() => _provinciaFilter = value); _load(); },
        selectedColor: scheme.primary.withOpacity(0.15),
        checkmarkColor: scheme.primary,
      ),
    );
  }
}

class _MachineCard extends StatefulWidget {
  final Map<String, dynamic> machine;
  const _MachineCard({required this.machine});
  @override
  State<_MachineCard> createState() => _MachineCardState();
}

class _MachineCardState extends State<_MachineCard> {
  bool _showForm = false;
  bool _loading = false;
  String? _success;
  String? _error;
  final _startCtrl = TextEditingController();
  final _endCtrl = TextEditingController();

  @override
  void dispose() { _startCtrl.dispose(); _endCtrl.dispose(); super.dispose(); }

  Future<void> _pickDate(TextEditingController ctrl) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      ctrl.text = '${picked.year}-${picked.month.toString().padLeft(2, "0")}-${picked.day.toString().padLeft(2, "0")}';
    }
  }

  Future<void> _rent() async {
    if (_startCtrl.text.isEmpty || _endCtrl.text.isEmpty) return;
    final token = context.read<AuthService>().token!;
    setState(() { _loading = true; _error = null; });
    try {
      await ApiService.rentMachine(token, widget.machine['id'], _startCtrl.text, _endCtrl.text);
      if (mounted) setState(() { _success = 'Reserva solicitada! Aguarde aprovação.'; _showForm = false; });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final m = widget.machine;
    final disponivel = m['disponivel'] == true;
    final auth = context.watch<AuthService>();
    final canRent = auth.isAuthenticated && auth.userRole == 'agricultor' && disponivel;

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
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(m['nome'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 4),
              Text(_tipoLabels[m['tipo']] ?? m['tipo'] ?? '',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('${_fmtKz(m["preco_diaria"])} Kz',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: scheme.secondary)),
              Text('/dia', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
            ]),
          ]),
          if (m['descricao'] != null) ...[
            const SizedBox(height: 8),
            Text(m['descricao'], style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
          ],
          const SizedBox(height: 10),
          Row(children: [
            Icon(Icons.location_on_outlined, size: 13, color: scheme.primary),
            const SizedBox(width: 4),
            Expanded(child: Text(
              [m['municipio'], m['provincia']].where((e) => e != null).join(', '),
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            )),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: (disponivel ? scheme.primary : Colors.red).withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                disponivel ? 'Disponível' : 'Indisponível',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                  color: disponivel ? scheme.primary : Colors.red),
              ),
            ),
          ]),
          if (_success != null) ...[
            const SizedBox(height: 8),
            Text(_success!, style: TextStyle(color: scheme.primary, fontSize: 13)),
          ],
          if (canRent && !_showForm) ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => setState(() => _showForm = true),
                icon: const Icon(Icons.calendar_today_outlined, size: 16),
                label: const Text('Solicitar aluguel'),
              ),
            ),
          ],
          if (_showForm) ...[
            const SizedBox(height: 12),
            const Divider(),
            Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Data de início', style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                const SizedBox(height: 4),
                TextField(
                  controller: _startCtrl, readOnly: true,
                  onTap: () => _pickDate(_startCtrl),
                  decoration: const InputDecoration(hintText: 'Selecionar', isDense: true,
                    suffixIcon: Icon(Icons.calendar_today, size: 16)),
                  style: const TextStyle(fontSize: 13)),
              ])),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Data de fim', style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                const SizedBox(height: 4),
                TextField(
                  controller: _endCtrl, readOnly: true,
                  onTap: () => _pickDate(_endCtrl),
                  decoration: const InputDecoration(hintText: 'Selecionar', isDense: true,
                    suffixIcon: Icon(Icons.calendar_today, size: 16)),
                  style: const TextStyle(fontSize: 13)),
              ])),
            ]),
            if (_error != null) ...[
              const SizedBox(height: 6),
              Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 12)),
            ],
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: ElevatedButton(
                onPressed: _loading ? null : _rent,
                child: _loading
                    ? const SizedBox(height: 18, width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Confirmar reserva'),
              )),
              const SizedBox(width: 8),
              OutlinedButton(
                onPressed: () => setState(() { _showForm = false; _error = null; }),
                child: const Text('Cancelar'),
              ),
            ]),
          ],
        ]),
      ),
    );
  }

  String _fmtKz(dynamic v) {
    final n = double.tryParse(v.toString()) ?? 0;
    return n.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]} ');
  }
}
