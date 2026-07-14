export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH';

export interface FileMetadata {
  type: string;
  source: string | null;
  path: string | null;
  generatedExternally?: boolean;
  fileSize?: number;
  lastModified?: string;
}

export interface RiskScore {
  tier: RiskTier;
  score: number;
  factors: string[];
}

/**
 * Calculates a real-time risk tier for a file based on metadata.
 * Higher risk weight is assigned to files generated externally.
 * 
 * @param metadata - File metadata including type, source, and generation flags
 * @returns RiskScore object with tier, numeric score, and contributing factors
 */
export function calculateRiskScore(metadata: FileMetadata): RiskScore {
  let score = 0;
  const factors: string[] = [];

  // External generation factor (highest weight)
  if (metadata.generatedExternally === true) {
    score += 40;
    factors.push('Generated externally');
  }

  // Source-based risk assessment
  if (metadata.source) {
    const sourceLower = metadata.source.toLowerCase();
    
    // High-risk sources
    if (sourceLower.includes('external') || sourceLower.includes('third-party') || sourceLower.includes('vendor')) {
      score += 30;
      factors.push('External source');
    }
    
    // Medium-risk sources
    if (sourceLower.includes('api') || sourceLower.includes('download') || sourceLower.includes('import')) {
      score += 20;
      factors.push('API/imported source');
    }
    
    // Low-risk sources
    if (sourceLower.includes('internal') || sourceLower.includes('local') || sourceLower.includes('manual')) {
      score += 5;
      factors.push('Internal source');
    }
  } else {
    score += 10;
    factors.push('Unknown source');
  }

  // File type-based risk
  const typeLower = metadata.type.toLowerCase();
  if (typeLower === 'pdf' || typeLower === 'docx') {
    score += 5;
    factors.push('Document format');
  } else if (typeLower === 'html' || typeLower === 'md' || typeLower === 'wiki') {
    score += 10;
    factors.push('Markup format');
  } else if (typeLower === 'other') {
    score += 15;
    factors.push('Unknown file type');
  }

  // File size risk (if available)
  if (metadata.fileSize !== undefined) {
    const sizeMB = metadata.fileSize / (1024 * 1024);
    if (sizeMB > 10) {
      score += 15;
      factors.push('Large file size');
    } else if (sizeMB > 5) {
      score += 10;
      factors.push('Moderate file size');
    }
  }

  // Determine risk tier based on score
  let tier: RiskTier;
  if (score >= 60) {
    tier = 'HIGH';
  } else if (score >= 30) {
    tier = 'MEDIUM';
  } else {
    tier = 'LOW';
  }

  return {
    tier,
    score,
    factors: factors.length > 0 ? factors : ['Standard file']
  };
}

/**
 * Gets a human-readable label for the risk tier
 */
export function getRiskTierLabel(tier: RiskTier): string {
  switch (tier) {
    case 'LOW':
      return 'Low Risk';
    case 'MEDIUM':
      return 'Medium Risk';
    case 'HIGH':
      return 'High Risk';
  }
}

/**
 * Gets the color class for displaying the risk tier badge
 */
export function getRiskTierColor(tier: RiskTier): string {
  switch (tier) {
    case 'LOW':
      return 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300';
    case 'MEDIUM':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
    case 'HIGH':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
  }
}
