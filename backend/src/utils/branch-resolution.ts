import prisma from '../config/database';

type BranchCandidate = {
  id: string;
  name: string;
  code: string;
};

type ScoredBranch = {
  candidate: BranchCandidate;
  strictMatch: boolean;
  tokenHits: number;
  score: number;
};

const normalizeBranchText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const toTokens = (value: string): string[] =>
  Array.from(new Set(normalizeBranchText(value).split(' ').filter((token) => token.length > 2)));

const scoreCandidate = (candidate: BranchCandidate, normalizedInput: string, tokens: string[]): ScoredBranch => {
  const normalizedName = normalizeBranchText(candidate.name);
  const normalizedCode = normalizeBranchText(candidate.code);

  const tokenHits = tokens.filter(
    (token) => normalizedName.includes(token) || normalizedCode.includes(token)
  ).length;

  const strictMatch =
    tokens.length > 0 &&
    tokens.every((token) => normalizedName.includes(token) || normalizedCode.includes(token));

  const containsInput =
    normalizedInput.length > 0 &&
    (normalizedName.includes(normalizedInput) || normalizedCode.includes(normalizedInput))
      ? 1
      : 0;

  const startsWithInput =
    normalizedInput.length > 0 &&
    (normalizedName.startsWith(normalizedInput) || normalizedCode.startsWith(normalizedInput))
      ? 1
      : 0;

  const score = tokenHits * 100 + containsInput * 10 + startsWithInput * 5;

  return {
    candidate,
    strictMatch,
    tokenHits,
    score,
  };
};

const pickSingleBest = (candidates: ScoredBranch[]): string | undefined => {
  if (candidates.length === 0) {
    return undefined;
  }

  const ordered = [...candidates].sort((left, right) => right.score - left.score);
  const topScore = ordered[0].score;
  const topRanked = ordered.filter((entry) => entry.score === topScore);

  if (topRanked.length !== 1) {
    return undefined;
  }

  return topRanked[0].candidate.id;
};

export async function resolveBranchIdFromInput(input: string): Promise<string | undefined> {
  const trimmedInput = input.trim();
  if (!trimmedInput) {
    return undefined;
  }

  const exactMatch = await prisma.branch.findFirst({
    where: {
      OR: [
        { name: { equals: trimmedInput } },
        { code: { equals: trimmedInput } },
      ],
    },
    select: { id: true },
  });

  if (exactMatch) {
    return exactMatch.id;
  }

  const tokens = toTokens(trimmedInput);
  if (tokens.length === 0) {
    return undefined;
  }

  const branches = await prisma.branch.findMany({
    select: {
      id: true,
      name: true,
      code: true,
    },
  });

  if (branches.length === 0) {
    return undefined;
  }

  const normalizedInput = normalizeBranchText(trimmedInput);
  const scored = branches.map((branch) => scoreCandidate(branch, normalizedInput, tokens));

  const strictCandidates = scored.filter((entry) => entry.strictMatch && entry.tokenHits > 0);
  const strictWinner = pickSingleBest(strictCandidates);
  if (strictWinner) {
    return strictWinner;
  }

  const fallbackCandidates = scored.filter((entry) => entry.tokenHits > 0);
  return pickSingleBest(fallbackCandidates);
}
