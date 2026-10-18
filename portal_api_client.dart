import 'dart:convert';
import 'package:http/http.dart' as http;

class PortalApiClient {
  final String baseUrl;

  PortalApiClient({required this.baseUrl});

  /// 1. Send Core IPC Request or Spawn Virtual Process
  Future<Map<String, dynamic>> sendIpcRequest({
    required String sourcePid,
    required String targetPid,
    required String method,
    required Map<String, dynamic> params,
  }) async {
    final uri = Uri.parse('$baseUrl/api/kernel/ipc');
    final payload = {
      "jsonrpc": "2.0",
      "msg_id": "msg_${DateTime.now().millisecondsSinceEpoch}",
      "source_pid": sourcePid,
      "target_pid": targetPid,
      "method": method,
      "params": params,
      "timestamp": DateTime.now().millisecondsSinceEpoch,
    };

    final response = await http.post(
      uri,
      headers: {"Content-Type": "application/json"},
      body: jsonEncode(payload),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      final errBody = jsonDecode(response.body);
      throw Exception(errBody['error'] ?? 'IPC Request Failed: ${response.statusCode}');
    }
  }

  /// 2. Trigger Automated Epoch Recovery / State Rollback
  Future<Map<String, dynamic>> triggerRecovery(String pid) async {
    final uri = Uri.parse('$baseUrl/api/kernel/recover');
    final response = await http.post(
      uri,
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({"pid": pid}),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final errBody = jsonDecode(response.body);
      throw Exception(errBody['error'] ?? 'State Recovery Failed');
    }
  }

  /// 3. Ingest Multi-Agent ICVS Cognitive Frame
  Future<Map<String, dynamic>> ingestIcvsFrame(Map<String, dynamic> frameData) async {
    final uri = Uri.parse('$baseUrl/api/kernel/icvs/ingest');
    final response = await http.post(
      uri,
      headers: {"Content-Type": "application/json"},
      body: jsonEncode(frameData),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final errBody = jsonDecode(response.body);
      throw Exception(errBody['error'] ?? 'ICVS Frame Ingestion Failed');
    }
  }
}
