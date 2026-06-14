export interface HistoryPoint {
  cycle: number;
  generated_at: string;
  trust_gap_pct: number;
  pass: number;
  partial: number;
  fail: number;
  scored: number;
  with_reference: number;
  pass_rate_pct: number;
}

export interface Identity {
  no_reference?: boolean;
  probes_unavailable?: boolean;
  reason?: string;
  exact?: number;
  sim?: number;
  null_exact?: number;
  diverges?: boolean;
  matches?: boolean;
  detail?: string;
  identity_score?: number;
  confidence?: string;
  binding?: string;
  bound?: boolean;
  sim_trusted?: number;
  sim_decoy?: number;
  exact_trusted?: number;
  margin?: number;
}

export interface Attestation {
  present: boolean;
  signature_valid?: boolean;
  root_trusted?: boolean;
  freshness_ok?: boolean;
  channel_bound?: boolean;
  binds_model?: boolean;
  score?: number;
  vendor?: string;
  notes?: string[];
  measurements?: Record<string, string>;
  signing_address?: string;
  tcb_status?: string;
  fmspc?: string;
  fleet_size?: number;
  gpu_arch?: string;
  gpu_die?: string;
  gpu_root_trusted?: boolean;
  attestation_type?: string;
}

export interface Verifier {
  login: string;
  mode?: string;
  at?: string;
}

export interface Task {
  id: string;
  title: string;
  type: string;
  status: string;
  difficulty?: string;
  blocked_on?: string;
  summary: string;
  contributors?: string[];
}

export interface ProviderRow {
  id: string;
  displayName: string;
  tags: string[];
  served_model?: string;
  attested_label?: string;
  pitch?: string;
  findings?: string[];
  verifiers?: Verifier[];
  status: string;
  reason?: string;
  verdict: string;
  score: number | null;
  delta?: number | null;
  identity?: Identity;
  attestation?: Attestation;
  evidence?: { merkle_root?: string | null; request_id?: string | null; errors?: number };
}

export interface Summary {
  providers: number;
  scored: number;
  pass: number;
  partial: number;
  fail: number;
  unknown: number;
  skipped: number;
  error?: number;
  with_reference: number;
  deviating: number;
  seals_verified?: number;
  trust_gap_pct: number;
  model_verified?: number;
  model_unverified?: number;
  model_unverified_pct?: number;
}

export interface Latest {
  cycle: number;
  generated_at: string;
  seed: number;
  seed_commit: string;
  summary: Summary;
  providers: ProviderRow[];
}
