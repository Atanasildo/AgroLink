import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../../services/auth_service.dart';

const String _wsBase = 'wss://agrolink-api-67zk.onrender.com/api/v1';

class TrackingScreen extends StatefulWidget {
  final String requestId;
  const TrackingScreen({super.key, required this.requestId});

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  WebSocketChannel? _channel;
  LatLng? _truckPosition;
  bool _connected = false;
  DateTime? _lastUpdate;
  StreamSubscription? _sub;

  @override
  void initState() {
    super.initState();
    _connect();
  }

  void _connect() {
    final token = context.read<AuthService>().token!;
    final uri = Uri.parse('$_wsBase/transport/ws/${widget.requestId}?token=$token');
    _channel = WebSocketChannel.connect(uri);
    setState(() => _connected = true);

    _sub = _channel!.stream.listen(
      (data) {
        final msg = jsonDecode(data as String);
        if (msg['type'] == 'location') {
          setState(() {
            _truckPosition = LatLng(
              (msg['latitude'] as num).toDouble(),
              (msg['longitude'] as num).toDouble(),
            );
            _lastUpdate = DateTime.now();
          });
        }
      },
      onDone: () {
        setState(() => _connected = false);
        // Tenta reconectar após 3 segundos
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) _connect();
        });
      },
      onError: (_) => setState(() => _connected = false),
    );
  }

  @override
  void dispose() {
    _sub?.cancel();
    _channel?.sink.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final defaultCenter = const LatLng(-11.2027, 17.8739); // Centro de Angola

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rastreamento'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Row(children: [
              Icon(
                _connected ? Icons.wifi : Icons.wifi_off,
                size: 16,
                color: _connected ? scheme.primary : Colors.grey,
              ),
              const SizedBox(width: 4),
              Text(
                _connected ? 'Ligado' : 'Desligado',
                style: TextStyle(fontSize: 12,
                  color: _connected ? scheme.primary : Colors.grey),
              ),
            ]),
          ),
        ],
      ),
      body: Column(
        children: [
          // Info da última atualização
          if (_lastUpdate != null)
            Container(
              width: double.infinity,
              color: scheme.primary.withOpacity(0.08),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text(
                '🚛 Atualizado às ${_lastUpdate!.toLocal().toString().substring(11, 16)}',
                style: TextStyle(fontSize: 13, color: scheme.primary, fontWeight: FontWeight.w600),
              ),
            ),

          // Mapa
          Expanded(
            child: _truckPosition == null
                ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const CircularProgressIndicator(),
                    const SizedBox(height: 16),
                    Text('À espera da localização do transportador...',
                      style: TextStyle(color: Colors.grey.shade600)),
                  ]))
                : FlutterMap(
                    options: MapOptions(
                      initialCenter: _truckPosition ?? defaultCenter,
                      initialZoom: 12,
                    ),
                    children: [
                      TileLayer(
                        urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'ao.agrolink.app',
                      ),
                      if (_truckPosition != null)
                        MarkerLayer(markers: [
                          Marker(
                            point: _truckPosition!,
                            width: 48,
                            height: 48,
                            child: Container(
                              decoration: BoxDecoration(
                                color: scheme.primary,
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 2),
                                boxShadow: [BoxShadow(
                                  color: scheme.primary.withOpacity(0.4),
                                  blurRadius: 8,
                                )],
                              ),
                              child: const Icon(Icons.local_shipping, color: Colors.white, size: 24),
                            ),
                          ),
                        ]),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}
