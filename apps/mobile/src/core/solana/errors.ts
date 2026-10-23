/** Turns what the network says about a failed simulation into something a person can act on. */
export function describeSimulationError(err: unknown, logs: string[] | null): string {
  if (err === 'AccountNotFound') return "This wallet doesn't hold any SOL yet. Get some test SOL from the faucet first.";
  if (err === 'BlockhashNotFound') return 'The network is out of sync with this transaction. Try again.';
  if (typeof err === 'object' && err !== null && 'InstructionError' in err) {
    const detail = (err as { InstructionError: [number, unknown] }).InstructionError[1];
    // System Program error 1 is "insufficient lamports".
    if (typeof detail === 'object' && detail !== null && (detail as { Custom?: number }).Custom === 1) {
      return 'Not enough SOL to cover this amount plus the network fee.';
    }
  }
  const lastLog = logs?.at(-1);
  return `The network would reject this transaction${lastLog ? `: ${lastLog}` : '.'}`;
}
