import 'dart:convert';
import 'package:http/http.dart' as http;

class PortalOS1Bridge {
  final String edgeEndpoint;
  final String ownerId;

  PortalOS1Bridge({
    required this.edgeEndpoint,
    required this.ownerId,
  });

  /// Dispatches a JSON-RPC 2.0 IPC request to the Portal-OS1 Edge Kernel
  Future<Map<String, dynamic>> sendIPC({
    required String targetPid,
    required String method,
    required Map<String, dynamic> params,
  }) async {
    final msgId = 'msg_${DateTime.now().millisecondsSinceEpoch}';
    
    final envelope = {
      "jsonrpc": "2.0",
      "msg_id": msgId,
      "source_pid": "client_pwa_root",
      "target_pid": targetPid,
      "method": method,
      "params": params,
      "timestamp": DateTime.now().millisecondsSinceEpoch,
    };

    try {
      final response = await http.post(
        Uri.parse('$edgeEndpoint/api/kernel/ipc'),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode(envelope),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Kernel IPC Error [${response.statusCode}]: ${response.body}');
      }
    } catch (e) {
      throw Exception('Network or Edge Gateway Failure: $e');
    }
  }

  /// Spawns a new virtual process thread on the edge microkernel
  Future<Map<String, dynamic>> spawnProcess({
    required String processId,
    required Map<String, dynamic> initialContext,
    int priority = 5,
  }) async {
    return await sendIPC(
      targetPid: "kernel_root",
      method: "kernel.process.spawn",
      params: {
        "pid": processId,
        "owner_id": ownerId,
        "priority": priority,
        "memory_bytes": 1024,
        "context": initialContext,
      },
    );
  }

  /// Triggers an automated state recovery rollback from the latest D1 epoch
  Future<Map<String, dynamic>> triggerRecovery(String processId) async {
    try {
      final response = await http.post(
        Uri.parse('$edgeEndpoint/api/kernel/recover'),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"pid": processId}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Recovery Failed: ${response.body}');
      }
    } catch (e) {
      throw Exception('Recovery Dispatch Error: $e');
    }
  }
}
