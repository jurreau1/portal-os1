import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'portal_provider.dart';

class PortalDashboardView extends ConsumerWidget {
  const PortalDashboardView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final processesAsync = ref.watch(portalProcessProvider);
    final endpoint = ref.watch(portalEndpointProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: const Color(0xFF161B22),
        title: const Text(
          "Portal-OS1 // Edge Hypervisor",
          style: TextStyle(color: Colors.white, fontFamily: 'monospace', fontSize: 16),
        ),
        actions: [
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Text(
                "TARGET: $endpoint",
                style: const TextStyle(color: Color(0xFF8B949E), fontSize: 12),
              ),
            ),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // System Status Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF161B22),
                border: Border.all(color: const Color(0xFF30363D)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: const [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("SYSTEM STATUS", style: TextStyle(color: Color(0xFF8B949E), fontSize: 10)),
                      SizedBox(height: 4),
                      Text("ONLINE ($0.00/mo Free Tier)", style: TextStyle(color: Color(0xFF3FB950), fontWeight: FontWeight.bold)),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("ARCHITECTURE", style: TextStyle(color: Color(0xFF8B949E), fontSize: 10)),
                      SizedBox(height: 4),
                      Text("Microkernel / D1 Epochs", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              "ACTIVE VIRTUAL PROCESSES",
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
            ),
            const SizedBox(height: 12),
            // Process List View
            Expanded(
              child: processesAsync.when(
                data: (processes) {
                  if (processes.isEmpty) {
                    return const Center(
                      child: Text("No active virtual processes spawned.", style: TextStyle(color: Color(0xFF8B949E))),
                    );
                  }
                  return ListView.builder(
                    itemCount: processes.length,
                    itemBuilder: (context, index) {
                      final proc = processes[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF161B22),
                          border: Border.all(color: const Color(0xFF30363D)),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(proc['result']?['pid'] ?? 'Unknown PID', style: const TextStyle(color: Colors.white, fontFamily: 'monospace')),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF21262D)),
                              onPressed: () {
                                final pid = proc['result']?['pid'];
                                if (pid != null) {
                                  ref.read(portalProcessProvider.notifier).triggerRecovery(pid);
                                }
                              },
                              child: const Text("Rollback Epoch", style: TextStyle(color: Color(0xFF58A6FF), fontSize: 12)),
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
                loading: () => const Center(child: CircularIndicator()),
                error: (err, _) => Center(child: Text("Error: $err", style: const TextStyle(color: Colors.red))),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFF238636),
        child: const Icon(Icons.add, color: Colors.white),
        onPressed: () {
          final newPid = 'proc_${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}';
          ref.read(portalProcessProvider.notifier).spawnProcess(
            newPid,
            {"state": "running", "module": "agent_worker"},
          );
        },
      ),
    );
  }
}
