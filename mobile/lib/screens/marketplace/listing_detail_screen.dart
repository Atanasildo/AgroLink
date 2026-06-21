import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';

class ListingDetailScreen extends StatefulWidget {
  final String id;
  const ListingDetailScreen({super.key, required this.id});

  @override
  State<ListingDetailScreen> createState() => _ListingDetailScreenState();
}

class _ListingDetailScreenState extends State<ListingDetailScreen> {
  Map<String, dynamic>? _listing;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final token = context.read<AuthService>().token;
      final data = await ApiService.getListing(widget.id, token: token);
      if (mounted) setState(() { _listing = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: Text(_listing?['titulo'] ?? 'Anúncio')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _listing == null
              ? const Center(child: Text('Anúncio não encontrado'))
              : SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Imagem
                      if (_listing!['imagem_url'] != null)
                        Image.network(_listing!['imagem_url'],
                          height: 220, fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            height: 220,
                            color: scheme.primary.withOpacity(0.08),
                            child: Icon(Icons.grass, size: 64, color: scheme.primary)))
                      else
                        Container(
                          height: 180,
                          color: scheme.primary.withOpacity(0.08),
                          child: Icon(Icons.grass, size: 64, color: scheme.primary)),

                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Título e preço
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(child: Text(_listing!['titulo'] ?? '',
                                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold))),
                                if (_listing!['preco'] != null)
                                  Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                                    Text('${_fmtKz(_listing!['preco'])} Kz',
                                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold,
                                        color: scheme.secondary)),
                                    if (_listing!['unidade'] != null)
                                      Text('por ${_listing!['unidade']}',
                                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                                  ]),
                              ],
                            ),
                            const SizedBox(height: 12),

                            // Tags
                            Wrap(spacing: 8, children: [
                              if (_listing!['categoria'] != null)
                                _buildChip(_listing!['categoria'], scheme),
                              if (_listing!['provincia'] != null)
                                _buildChip('📍 ${_listing!['provincia']}', scheme),
                              if (_listing!['quantidade'] != null)
                                _buildChip('⚖️ ${_listing!['quantidade']} ${_listing!['unidade'] ?? ''}', scheme),
                            ]),
                            const SizedBox(height: 16),

                            // Descrição
                            if (_listing!['descricao'] != null) ...[
                              const Text('Descrição', style: TextStyle(fontWeight: FontWeight.bold)),
                              const SizedBox(height: 6),
                              Text(_listing!['descricao'],
                                style: TextStyle(color: Colors.grey.shade700, height: 1.5)),
                              const SizedBox(height: 16),
                            ],

                            // Vendedor
                            if (_listing!['vendedor_nome'] != null) ...[
                              const Divider(),
                              const SizedBox(height: 8),
                              Row(children: [
                                CircleAvatar(
                                  backgroundColor: scheme.primary.withOpacity(0.1),
                                  child: Icon(Icons.person, color: scheme.primary),
                                ),
                                const SizedBox(width: 12),
                                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(_listing!['vendedor_nome'],
                                    style: const TextStyle(fontWeight: FontWeight.w600)),
                                  Text(_listing!['provincia'] ?? '',
                                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                                ]),
                              ]),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
      bottomNavigationBar: _listing != null
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.chat_outlined),
                  label: const Text('Contactar vendedor'),
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildChip(String label, ColorScheme scheme) {
    return Chip(
      label: Text(label, style: const TextStyle(fontSize: 12)),
      backgroundColor: scheme.primary.withOpacity(0.08),
      side: BorderSide.none,
      padding: EdgeInsets.zero,
    );
  }

  String _fmtKz(dynamic v) {
    final n = double.tryParse(v.toString()) ?? 0;
    return n.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]} ');
  }
}
