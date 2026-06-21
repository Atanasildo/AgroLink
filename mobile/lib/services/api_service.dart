import 'dart:convert';
import 'package:http/http.dart' as http;

const String _baseUrl = 'https://agrolink-api-67zk.onrender.com/api/v1';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  const ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiService {
  static Future<dynamic> request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    String? token,
    Map<String, String>? queryParams,
  }) async {
    var uri = Uri.parse('$_baseUrl$path');
    if (queryParams != null && queryParams.isNotEmpty) {
      uri = uri.replace(queryParameters: queryParams);
    }

    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };

    http.Response response;
    switch (method.toUpperCase()) {
      case 'GET':
        response = await http.get(uri, headers: headers);
      case 'POST':
        response = await http.post(uri, headers: headers, body: jsonEncode(body));
      case 'PUT':
        response = await http.put(uri, headers: headers, body: jsonEncode(body));
      case 'PATCH':
        response = await http.patch(uri, headers: headers, body: jsonEncode(body));
      case 'DELETE':
        response = await http.delete(uri, headers: headers);
      default:
        throw ApiException(0, 'Método HTTP não suportado: $method');
    }

    if (response.statusCode == 204) return null;

    final data = jsonDecode(utf8.decode(response.bodyBytes));

    if (response.statusCode >= 400) {
      final detail = data is Map ? (data['detail'] ?? 'Erro desconhecido') : 'Erro desconhecido';
      throw ApiException(response.statusCode, detail.toString());
    }

    return data;
  }

  // Auth
  static Future<Map<String, dynamic>> login(String email, String password) async {
    return await request('POST', '/auth/login', body: {'email': email, 'password': password});
  }

  static Future<Map<String, dynamic>> register({
    required String nome,
    required String email,
    required String password,
    required String role,
    required String provincia,
  }) async {
    return await request('POST', '/auth/register', body: {
      'nome': nome,
      'email': email,
      'password': password,
      'role': role,
      'provincia': provincia,
    });
  }

  static Future<Map<String, dynamic>> me(String token) async {
    return await request('GET', '/auth/me', token: token);
  }

  // Marketplace - Listagens
  static Future<List<dynamic>> getListings({
    String? token,
    String? categoria,
    String? provincia,
    String? search,
  }) async {
    return await request('GET', '/listings', token: token, queryParams: {
      if (categoria != null) 'categoria': categoria,
      if (provincia != null) 'provincia': provincia,
      if (search != null && search.isNotEmpty) 'search': search,
    });
  }

  static Future<Map<String, dynamic>> getListing(String id, {String? token}) async {
    return await request('GET', '/listings/$id', token: token);
  }

  // Preços
  static Future<List<dynamic>> getPrices({String? provincia, String? produto}) async {
    return await request('GET', '/prices', queryParams: {
      if (provincia != null) 'provincia': provincia,
      if (produto != null) 'produto': produto,
    });
  }

  // Transporte - Rotas
  static Future<List<dynamic>> searchRoutes({String? origem, String? destino}) async {
    return await request('GET', '/transport/routes', queryParams: {
      if (origem != null) 'origem': origem,
      if (destino != null) 'destino': destino,
    });
  }

  // Transporte - Solicitações
  static Future<Map<String, dynamic>> createTransportRequest({
    required String token,
    required String produto,
    required double pesoToneladas,
    required String origem,
    required String destino,
    required String data,
    String? rotaId,
  }) async {
    return await request('POST', '/transport/requests', token: token, body: {
      'produto': produto,
      'peso_toneladas': pesoToneladas,
      'origem': origem,
      'destino': destino,
      'data': data,
      if (rotaId != null) 'rota_id': rotaId,
    });
  }

  static Future<List<dynamic>> myTransportRequests(String token) async {
    return await request('GET', '/transport/requests/me', token: token);
  }

  // Pagamentos
  static Future<Map<String, dynamic>> getTransportPayment(String token, String requestId) async {
    return await request('GET', '/payments/transport/$requestId', token: token);
  }

  static Future<Map<String, dynamic>> simulatePayment(String token, String paymentId) async {
    return await request('POST', '/payments/$paymentId/simulate-confirm', token: token);
  }
}
