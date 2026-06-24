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
    String method, String path, {
    Map<String, dynamic>? body, String? token, Map<String, String>? queryParams,
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
      case 'GET': response = await http.get(uri, headers: headers);
      case 'POST': response = await http.post(uri, headers: headers, body: jsonEncode(body));
      case 'PUT': response = await http.put(uri, headers: headers, body: jsonEncode(body));
      case 'PATCH': response = await http.patch(uri, headers: headers, body: jsonEncode(body));
      case 'DELETE': response = await http.delete(uri, headers: headers);
      default: throw ApiException(0, 'Método HTTP não suportado: $method');
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
  static Future<Map<String, dynamic>> login(String email, String password) async =>
      await request('POST', '/auth/login', body: {'email': email, 'password': password});

  static Future<Map<String, dynamic>> register({
    required String nome, required String email, required String password,
    required String role, required String provincia,
  }) async => await request('POST', '/auth/register', body: {
    'nome': nome, 'email': email, 'password': password, 'role': role, 'provincia': provincia,
  });

  static Future<Map<String, dynamic>> me(String token) async =>
      await request('GET', '/auth/me', token: token);

  static Future<void> changePassword(String token, String senhaAtual, String senhaNova) async =>
      await request('POST', '/auth/change-password', token: token,
        body: {'senha_atual': senhaAtual, 'senha_nova': senhaNova});

  // Marketplace
  static Future<List<dynamic>> getListings({
    String? token, String? categoria, String? provincia, String? search,
  }) async => await request('GET', '/products/', token: token, queryParams: {
    if (categoria != null) 'categoria': categoria,
    if (provincia != null) 'provincia': provincia,
    if (search != null && search.isNotEmpty) 'search': search,
  });

  static Future<Map<String, dynamic>> getListing(String id, {String? token}) async =>
      await request('GET', '/products/$id', token: token);

  // Precos
  static Future<List<dynamic>> getLatestPrices({String? produto, String? provincia}) async =>
      await request('GET', '/prices/latest', queryParams: {
        if (produto != null) 'produto': produto,
        if (provincia != null) 'provincia': provincia,
      });

  static Future<List<dynamic>> getPriceHistory({String? produto, String? provincia}) async =>
      await request('GET', '/prices/history', queryParams: {
        if (produto != null) 'produto': produto,
        if (provincia != null) 'provincia': provincia,
        'limit': '30',
      });

  static Future<List<dynamic>> comparePrices({required String produto}) async =>
      await request('GET', '/prices/compare', queryParams: {'produto': produto});

  static Future<List<dynamic>> getPrices({String? provincia, String? produto}) async =>
      await request('GET', '/prices/latest', queryParams: {
        if (provincia != null) 'provincia': provincia,
        if (produto != null) 'produto': produto,
      });

  // Maquinas
  static Future<List<dynamic>> getMachines({String? provincia, String? municipio}) async =>
      await request('GET', '/machines/', queryParams: {
        if (provincia != null) 'provincia': provincia,
        if (municipio != null) 'municipio': municipio,
      });

  static Future<Map<String, dynamic>> rentMachine(
      String token, String machineId, String dataInicio, String dataFim) async =>
      await request('POST', '/machines/$machineId/rentals', token: token,
        body: {'data_inicio': dataInicio, 'data_fim': dataFim});

  // Social
  static Future<List<dynamic>> getPosts({String? tipo, String? token}) async =>
      await request('GET', '/social/posts', token: token, queryParams: {
        if (tipo != null) 'tipo': tipo,
      });

  static Future<Map<String, dynamic>> createPost(
      String token, String conteudo, String tipo) async =>
      await request('POST', '/social/posts', token: token,
        body: {'conteudo': conteudo, 'tipo': tipo});

  static Future<Map<String, dynamic>> toggleLike(String token, String postId) async =>
      await request('POST', '/social/posts/$postId/like', token: token);

  static Future<List<dynamic>> getComments(String postId) async =>
      await request('GET', '/social/posts/$postId/comments');

  static Future<Map<String, dynamic>> addComment(
      String token, String postId, String conteudo) async =>
      await request('POST', '/social/posts/$postId/comments', token: token,
        body: {'conteudo': conteudo});

  // Chat
  static Future<List<dynamic>> getConversations(String token) async =>
      await request('GET', '/chat/conversations', token: token);

  static Future<List<dynamic>> getConversation(String token, String otherUserId) async =>
      await request('GET', '/chat/conversations/$otherUserId', token: token);

  static Future<Map<String, dynamic>> sendMessage(
      String token, String destinatarioId, String conteudo) async =>
      await request('POST', '/chat/messages', token: token,
        body: {'destinatario_id': destinatarioId, 'conteudo': conteudo, 'tipo': 'texto'});

  static Future<List<dynamic>> searchUsers(String token, String q) async =>
      await request('GET', '/users/', token: token, queryParams: {'q': q, 'limit': '15'});

  static Future<Map<String, dynamic>> getUser(String userId) async =>
      await request('GET', '/users/$userId');

  // Profile
  static Future<Map<String, dynamic>> updateProfile(String token,
      {String? nome, String? telefone, String? provincia, String? bio}) async =>
      await request('PUT', '/users/me', token: token, body: {
        if (nome != null) 'nome': nome,
        if (telefone != null) 'telefone': telefone,
        if (provincia != null) 'provincia': provincia,
        if (bio != null) 'bio': bio,
      });

  // Transporte
  static Future<List<dynamic>> searchRoutes({String? origem, String? destino}) async =>
      await request('GET', '/transport/routes', queryParams: {
        if (origem != null) 'origem': origem,
        if (destino != null) 'destino': destino,
      });

  static Future<Map<String, dynamic>> createTransportRequest({
    required String token, required String produto, required double pesoToneladas,
    required String origem, required String destino, required String data, String? rotaId,
  }) async => await request('POST', '/transport/requests', token: token, body: {
    'produto': produto, 'peso_toneladas': pesoToneladas,
    'origem': origem, 'destino': destino, 'data': data,
    if (rotaId != null) 'rota_id': rotaId,
  });

  static Future<List<dynamic>> myTransportRequests(String token) async =>
      await request('GET', '/transport/requests/me', token: token);

  static Future<Map<String, dynamic>> getTransportPayment(String token, String requestId) async =>
      await request('GET', '/payments/transport/$requestId', token: token);

  static Future<Map<String, dynamic>> simulatePayment(String token, String paymentId) async =>
      await request('POST', '/payments/$paymentId/simulate-confirm', token: token);
}