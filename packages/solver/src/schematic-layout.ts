import { SchematicLayoutRequestSchema } from "../../schemas/src/index.js";
import type {
  CadAssetRecord,
  IntegerGridDimensions,
  SemanticAnchorFace,
  SchematicConstraintNode,
  SchematicGridPosition,
  SchematicLayoutRejection,
  SchematicLayoutRejectionCode,
  SchematicLayoutRequest,
  SchematicLayoutResult,
  SchematicPlacement,
} from "../../schemas/src/index.js";

type Bounds = IntegerGridDimensions;
type Point = SchematicGridPosition;

type PlacedNode = {
  node: SchematicConstraintNode;
  placement: SchematicPlacement;
};

type RoutingBounds = {
  min: Point;
  max: Point;
};

const sixDirections: readonly Point[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

function point(x: number, y: number, z: number): Point {
  return [x, y, z];
}

function pointKey(value: readonly number[]): string {
  return `${value[0]},${value[1]},${value[2]}`;
}

function rejected(
  code: SchematicLayoutRejectionCode,
  message: string,
  details: Omit<SchematicLayoutRejection, "code" | "message"> = {},
): SchematicLayoutResult {
  return {
    outcome: "rejected",
    rejection: { code, message, ...details },
  };
}

function assetBounds(asset: CadAssetRecord | undefined): Bounds | undefined {
  return asset?.boundsMm;
}

function isRigid(node: SchematicConstraintNode): boolean {
  return node.role !== "flexible";
}

function occupiesSpace(node: SchematicConstraintNode): boolean {
  return node.role !== "container" && node.role !== "flexible";
}

function* boxVoxels(origin: Point, bounds: Bounds): Generator<Point> {
  for (let x = origin[0]; x < origin[0] + bounds[0]; x += 1) {
    for (let y = origin[1]; y < origin[1] + bounds[1]; y += 1) {
      for (let z = origin[2]; z < origin[2] + bounds[2]; z += 1) {
        yield point(x, y, z);
      }
    }
  }
}

function collides(origin: Point, bounds: Bounds, occupied: ReadonlySet<string>): boolean {
  for (const voxel of boxVoxels(origin, bounds)) {
    if (occupied.has(pointKey(voxel))) return true;
  }
  return false;
}

function occupy(origin: Point, bounds: Bounds, occupied: Set<string>): void {
  for (const voxel of boxVoxels(origin, bounds)) occupied.add(pointKey(voxel));
}

function* scanXY(minX: number, maxX: number, minY: number, maxY: number, z: number): Generator<Point> {
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) yield point(x, y, z);
  }
}

function* scanYZ(x: number, minY: number, maxY: number, minZ: number, maxZ: number): Generator<Point> {
  for (let z = minZ; z <= maxZ; z += 1) {
    for (let y = minY; y <= maxY; y += 1) yield point(x, y, z);
  }
}

function* scanXZ(minX: number, maxX: number, y: number, minZ: number, maxZ: number): Generator<Point> {
  for (let z = minZ; z <= maxZ; z += 1) {
    for (let x = minX; x <= maxX; x += 1) yield point(x, y, z);
  }
}

type CandidateSearch = { ok: true; candidates: Iterable<Point> } | { ok: false };

function faceCandidates(parent: SchematicPlacement, childBounds: Bounds, face: SemanticAnchorFace): CandidateSearch {
  const [parentX, parentY, parentZ] = parent.gridPosition;
  const [parentWidth, parentDepth, parentHeight] = parent.boundsMm;
  const [childWidth, childDepth, childHeight] = childBounds;
  const maxX = parentX + parentWidth - childWidth;
  const maxY = parentY + parentDepth - childDepth;
  const maxZ = parentZ + parentHeight - childHeight;

  switch (face) {
    case "inside_bottom":
      return maxX >= parentX && maxY >= parentY && maxZ >= parentZ
        ? { ok: true, candidates: scanXY(parentX, maxX, parentY, maxY, parentZ) }
        : { ok: false };
    case "inside_top":
      return maxX >= parentX && maxY >= parentY && maxZ >= parentZ
        ? { ok: true, candidates: scanXY(parentX, maxX, parentY, maxY, maxZ) }
        : { ok: false };
    case "inside_left":
      return maxY >= parentY && maxZ >= parentZ && maxX >= parentX
        ? { ok: true, candidates: scanYZ(parentX, parentY, maxY, parentZ, maxZ) }
        : { ok: false };
    case "inside_right":
      return maxY >= parentY && maxZ >= parentZ && maxX >= parentX
        ? { ok: true, candidates: scanYZ(maxX, parentY, maxY, parentZ, maxZ) }
        : { ok: false };
    case "inside_front":
      return maxX >= parentX && maxZ >= parentZ && maxY >= parentY
        ? { ok: true, candidates: scanXZ(parentX, maxX, parentY, parentZ, maxZ) }
        : { ok: false };
    case "inside_back":
      return maxX >= parentX && maxZ >= parentZ && maxY >= parentY
        ? { ok: true, candidates: scanXZ(parentX, maxX, maxY, parentZ, maxZ) }
        : { ok: false };
    case "top":
      return maxX >= parentX && maxY >= parentY
        ? { ok: true, candidates: scanXY(parentX, maxX, parentY, maxY, parentZ + parentHeight) }
        : { ok: false };
    case "bottom":
      return maxX >= parentX && maxY >= parentY
        ? { ok: true, candidates: scanXY(parentX, maxX, parentY, maxY, parentZ - childHeight) }
        : { ok: false };
    case "left":
      return maxY >= parentY && maxZ >= parentZ
        ? { ok: true, candidates: scanYZ(parentX - childWidth, parentY, maxY, parentZ, maxZ) }
        : { ok: false };
    case "right":
      return maxY >= parentY && maxZ >= parentZ
        ? { ok: true, candidates: scanYZ(parentX + parentWidth, parentY, maxY, parentZ, maxZ) }
        : { ok: false };
    case "front":
      return maxX >= parentX && maxZ >= parentZ
        ? { ok: true, candidates: scanXZ(parentX, maxX, parentY - childDepth, parentZ, maxZ) }
        : { ok: false };
    case "back":
      return maxX >= parentX && maxZ >= parentZ
        ? { ok: true, candidates: scanXZ(parentX, maxX, parentY + parentDepth, parentZ, maxZ) }
        : { ok: false };
    case "center":
      return maxX >= parentX && maxY >= parentY && maxZ >= parentZ
        ? {
          ok: true,
          candidates: [point(
            parentX + Math.floor((parentWidth - childWidth) / 2),
            parentY + Math.floor((parentDepth - childDepth) / 2),
            parentZ + Math.floor((parentHeight - childHeight) / 2),
          )],
        }
        : { ok: false };
  }
}

function anchorPosition(placement: SchematicPlacement, face: SemanticAnchorFace): Point {
  const [x, y, z] = placement.gridPosition;
  const [width, depth, height] = placement.boundsMm;
  const centerX = x + Math.floor(width / 2);
  const centerY = y + Math.floor(depth / 2);
  const centerZ = z + Math.floor(height / 2);
  switch (face) {
    case "top":
    case "inside_top": return point(centerX, centerY, z + height);
    case "bottom":
    case "inside_bottom": return point(centerX, centerY, z - 1);
    case "left":
    case "inside_left": return point(x - 1, centerY, centerZ);
    case "right":
    case "inside_right": return point(x + width, centerY, centerZ);
    case "front":
    case "inside_front": return point(centerX, y - 1, centerZ);
    case "back":
    case "inside_back": return point(centerX, y + depth, centerZ);
    case "center": return point(centerX, centerY, centerZ);
  }
}

function manhattan(left: Point, right: Point): number {
  return Math.abs(left[0] - right[0]) + Math.abs(left[1] - right[1]) + Math.abs(left[2] - right[2]);
}

function routingBounds(placements: readonly SchematicPlacement[]): RoutingBounds {
  const padding = 6;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const placement of placements) {
    minX = Math.min(minX, placement.gridPosition[0]);
    minY = Math.min(minY, placement.gridPosition[1]);
    minZ = Math.min(minZ, placement.gridPosition[2]);
    maxX = Math.max(maxX, placement.gridPosition[0] + placement.boundsMm[0] - 1);
    maxY = Math.max(maxY, placement.gridPosition[1] + placement.boundsMm[1] - 1);
    maxZ = Math.max(maxZ, placement.gridPosition[2] + placement.boundsMm[2] - 1);
  }
  return {
    min: point(minX - padding, minY - padding, minZ - padding),
    max: point(maxX + padding, maxY + padding, maxZ + padding),
  };
}

function withinBounds(value: Point, bounds: RoutingBounds): boolean {
  return value[0] >= bounds.min[0] && value[0] <= bounds.max[0]
    && value[1] >= bounds.min[1] && value[1] <= bounds.max[1]
    && value[2] >= bounds.min[2] && value[2] <= bounds.max[2];
}

function reconstructRoute(cameFrom: ReadonlyMap<string, Point>, current: Point): Point[] {
  const route = [current];
  let key = pointKey(current);
  while (cameFrom.has(key)) {
    const previous = cameFrom.get(key)!;
    route.push(previous);
    key = pointKey(previous);
  }
  return route.reverse();
}

function routeAStar(start: Point, end: Point, occupied: ReadonlySet<string>, bounds: RoutingBounds): Point[] | undefined {
  const startKey = pointKey(start);
  const endKey = pointKey(end);
  if (occupied.has(startKey) || occupied.has(endKey)) return undefined;
  const open = [start];
  const openKeys = new Set([startKey]);
  const gScore = new Map<string, number>([[startKey, 0]]);
  const cameFrom = new Map<string, Point>();
  const maxVisits = 150_000;
  let visits = 0;

  while (open.length > 0 && visits < maxVisits) {
    let bestIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let index = 0; index < open.length; index += 1) {
      const candidate = open[index]!;
      const candidateKey = pointKey(candidate);
      const score = (gScore.get(candidateKey) ?? Number.POSITIVE_INFINITY) + manhattan(candidate, end);
      if (score < bestScore || (score === bestScore && candidateKey < pointKey(open[bestIndex]!))) {
        bestScore = score;
        bestIndex = index;
      }
    }

    const current = open.splice(bestIndex, 1)[0]!;
    const currentKey = pointKey(current);
    openKeys.delete(currentKey);
    visits += 1;
    if (currentKey === endKey) return reconstructRoute(cameFrom, current);

    const currentCost = gScore.get(currentKey)!;
    for (const direction of sixDirections) {
      const next = point(current[0] + direction[0], current[1] + direction[1], current[2] + direction[2]);
      const nextKey = pointKey(next);
      if (!withinBounds(next, bounds)) continue;
      if (occupied.has(nextKey)) continue;
      const nextCost = currentCost + 1;
      if (nextCost >= (gScore.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue;
      cameFrom.set(nextKey, current);
      gScore.set(nextKey, nextCost);
      if (!openKeys.has(nextKey)) {
        open.push(next);
        openKeys.add(nextKey);
      }
    }
  }
  return undefined;
}

function validateSequence(
  request: SchematicLayoutRequest,
  nodesByPartId: ReadonlyMap<string, SchematicConstraintNode>,
): SchematicLayoutResult | undefined {
  const { assemblySequence, connections } = request.graph;
  if (assemblySequence.length === 0) {
    return rejected("INVALID_SEQUENCE", "A schematic layout requires a canonical assembly sequence.");
  }
  const connectionById = new Map(connections.map((connection) => [connection.id, connection]));
  const placedAt = new Map<string, number>();
  const connectedAt = new Set<string>();
  const seenOrders = new Set<number>();
  const seenSteps = new Set<string>();

  for (const step of [...assemblySequence].sort((left, right) => left.order - right.order)) {
    if (seenOrders.has(step.order) || seenSteps.has(step.id)) {
      return rejected("INVALID_SEQUENCE", "Assembly sequence step IDs and order values must be unique.", { sequenceStepId: step.id });
    }
    seenOrders.add(step.order);
    seenSteps.add(step.id);
    if (step.kind === "place_part") {
      const node = step.partId ? nodesByPartId.get(step.partId) : undefined;
      if (!node || !isRigid(node)) {
        return rejected("INVALID_SEQUENCE", "A place_part step must reference a known rigid schematic part.", { sequenceStepId: step.id, partId: step.partId });
      }
      if (node.parentPartId) {
        const parentOrder = placedAt.get(node.parentPartId);
        if (parentOrder === undefined || parentOrder >= step.order) {
          return rejected("INVALID_SEQUENCE", "A child part cannot be placed before its parent prerequisite.", { sequenceStepId: step.id, partId: node.partId });
        }
      }
      placedAt.set(node.partId, step.order);
      continue;
    }

    const connection = step.connectionId ? connectionById.get(step.connectionId) : undefined;
    if (!connection) {
      return rejected("INVALID_SEQUENCE", "A connect_flexible step must reference a known connection.", { sequenceStepId: step.id, connectionId: step.connectionId });
    }
    const fromOrder = placedAt.get(connection.fromPartId);
    const toOrder = placedAt.get(connection.toPartId);
    if (fromOrder === undefined || toOrder === undefined || fromOrder >= step.order || toOrder >= step.order) {
      return rejected("INVALID_SEQUENCE", "A flexible connection cannot be made before both endpoints are placed.", { sequenceStepId: step.id, connectionId: connection.id });
    }
    connectedAt.add(connection.id);
  }

  for (const node of request.graph.nodes) {
    if (isRigid(node) && !placedAt.has(node.partId)) {
      return rejected("INVALID_SEQUENCE", "Every rigid schematic part must appear in the canonical assembly sequence.", { partId: node.partId });
    }
  }
  for (const connection of connections) {
    if (!connectedAt.has(connection.id)) {
      return rejected("INVALID_SEQUENCE", "Every flexible connection must appear in the canonical assembly sequence.", { connectionId: connection.id });
    }
  }
  return undefined;
}

/**
 * Deterministic sparse-grid schematic layout. It receives only symbolic agent intent and
 * source-backed CAD bounds; all grid positions and flexible routes originate here.
 */
export function solveSchematicLayout(input: unknown): SchematicLayoutResult {
  const parsedRequest = SchematicLayoutRequestSchema.safeParse(input);
  if (!parsedRequest.success) {
    return rejected(
      "INVALID_GRAPH",
      "Schematic layout requests must match the strict symbolic contract before deterministic placement.",
    );
  }
  const request: SchematicLayoutRequest = parsedRequest.data;
  const nodesByPartId = new Map<string, SchematicConstraintNode>();
  for (const node of request.graph.nodes) {
    if (nodesByPartId.has(node.partId)) {
      return rejected("INVALID_GRAPH", "A schematic graph cannot contain duplicate part nodes.", { partId: node.partId });
    }
    nodesByPartId.set(node.partId, node);
  }
  const connectionIds = new Set<string>();
  for (const connection of request.graph.connections) {
    if (connectionIds.has(connection.id)) {
      return rejected("INVALID_GRAPH", "A schematic graph cannot contain duplicate connection IDs.", { connectionId: connection.id });
    }
    connectionIds.add(connection.id);
  }

  const assetsByPartId = new Map<string, CadAssetRecord>();
  for (const asset of request.cadAssets) {
    if (assetsByPartId.has(asset.partId)) {
      return rejected("INVALID_GRAPH", "A schematic layout request cannot contain duplicate CAD assets.", { partId: asset.partId });
    }
    assetsByPartId.set(asset.partId, asset);
  }

  const quarantinedParts = request.graph.nodes.flatMap((node) => {
    const asset = assetsByPartId.get(node.partId);
    if (!asset) return [];
    const confidence = asset.dimensionEvidence?.confidence ?? null;
    if (asset.boundsMm && confidence !== null && confidence >= request.requiredDimensionConfidence) return [];
    return [{
      partId: node.partId,
      observedConfidence: confidence,
      requiredConfidence: request.requiredDimensionConfidence,
      reason: asset.boundsMm
        ? "The CAD asset's dimensional evidence does not meet the required confidence threshold."
        : "The CAD asset has no integer outer bounds for deterministic schematic layout.",
    }];
  });
  if (quarantinedParts.length > 0) return { outcome: "quarantined", quarantinedParts };

  for (const node of request.graph.nodes) {
    if (!assetsByPartId.has(node.partId)) {
      return rejected("UNKNOWN_PART", "A schematic node has no approved CAD asset.", { partId: node.partId });
    }
  }

  const sequenceError = validateSequence(request, nodesByPartId);
  if (sequenceError) return sequenceError;

  const rigidNodes = request.graph.nodes.filter(isRigid);
  const roots = rigidNodes.filter((node) => !node.parentPartId);
  if (roots.length !== 1 || !roots[0] || (roots[0].role !== "container" && roots[0].role !== "base")) {
    return rejected("AMBIGUOUS_ROOT", "A schematic requires exactly one container or base root.");
  }

  const occupied = new Set<string>();
  const placementsByPartId = new Map<string, PlacedNode>();
  const visiting = new Set<string>();
  let placementError: SchematicLayoutResult | undefined;

  const placeNode = (partId: string): void => {
    if (placementsByPartId.has(partId) || placementError) return;
    if (visiting.has(partId)) {
      placementError = rejected("CYCLIC_PARENTAGE", "Schematic parent relationships must not contain a cycle.", { partId });
      return;
    }
    const node = nodesByPartId.get(partId);
    const asset = assetsByPartId.get(partId);
    const bounds = assetBounds(asset);
    if (!node || !bounds) {
      placementError = rejected("UNKNOWN_PART", "A rigid schematic part is missing approved physical metadata.", { partId });
      return;
    }
    visiting.add(partId);
    let selectedPosition: Point | undefined;

    if (!node.parentPartId) {
      selectedPosition = point(0, 0, 0);
    } else {
      const parentNode = nodesByPartId.get(node.parentPartId);
      if (!parentNode || !isRigid(parentNode)) {
        placementError = rejected("UNKNOWN_PARENT", "A schematic part references an unavailable rigid parent.", { partId: node.partId });
        visiting.delete(partId);
        return;
      }
      placeNode(parentNode.partId);
      if (placementError) {
        visiting.delete(partId);
        return;
      }
      const parent = placementsByPartId.get(parentNode.partId)!;
      const anchor = node.parentAnchor ? parentNode.anchors.find((candidate) => candidate.name === node.parentAnchor) : undefined;
      if (!anchor) {
        placementError = rejected("UNKNOWN_ANCHOR", "A schematic part references an unavailable parent anchor.", { partId: node.partId });
        visiting.delete(partId);
        return;
      }
      if (anchor.face.startsWith("inside_") && parentNode.role !== "container") {
        placementError = rejected("INVALID_GRAPH", "Only a container may expose an interior placement anchor.", { partId: node.partId });
        visiting.delete(partId);
        return;
      }
      const search = faceCandidates(parent.placement, bounds, anchor.face);
      if (!search.ok) {
        placementError = rejected("OUT_OF_BOUNDS", "The part does not fit within the requested parent anchor boundary.", { partId: node.partId });
        visiting.delete(partId);
        return;
      }
      for (const candidate of search.candidates) {
        if (!collides(candidate, bounds, occupied)) {
          selectedPosition = candidate;
          break;
        }
      }
      if (!selectedPosition) {
        placementError = rejected("COLLISION", "No collision-free location is available at the requested parent anchor.", { partId: node.partId });
        visiting.delete(partId);
        return;
      }
    }

    const placement: SchematicPlacement = { partId: node.partId, gridPosition: selectedPosition, boundsMm: bounds };
    placementsByPartId.set(node.partId, { node, placement });
    if (occupiesSpace(node)) occupy(selectedPosition, bounds, occupied);
    visiting.delete(partId);
  };

  for (const node of rigidNodes) placeNode(node.partId);
  if (placementError) return placementError;

  const placements = [...placementsByPartId.values()].map((value) => value.placement);
  const bounds = routingBounds(placements);
  const routes = [] as { connectionId: string; points: Point[] }[];
  for (const connection of request.graph.connections) {
    const from = placementsByPartId.get(connection.fromPartId);
    const to = placementsByPartId.get(connection.toPartId);
    const fromNode = nodesByPartId.get(connection.fromPartId);
    const toNode = nodesByPartId.get(connection.toPartId);
    const fromAnchor = fromNode?.anchors.find((anchor) => anchor.name === connection.fromAnchor);
    const toAnchor = toNode?.anchors.find((anchor) => anchor.name === connection.toAnchor);
    if (!from || !to || !fromAnchor || !toAnchor) {
      return rejected("UNKNOWN_ANCHOR", "A flexible connection references an unavailable placed endpoint or anchor.", { connectionId: connection.id });
    }
    if (connection.flexiblePartId) {
      const flexibleNode = nodesByPartId.get(connection.flexiblePartId);
      if (!flexibleNode || flexibleNode.role !== "flexible") {
        return rejected("UNKNOWN_PART", "A flexible connection references an unavailable flexible part.", { connectionId: connection.id, partId: connection.flexiblePartId });
      }
    }
    const start = anchorPosition(from.placement, fromAnchor.face);
    const end = anchorPosition(to.placement, toAnchor.face);
    const route = routeAStar(start, end, occupied, bounds);
    if (!route) {
      return rejected("ROUTE_UNAVAILABLE", "No collision-free route is available for the requested flexible connection.", { connectionId: connection.id });
    }
    routes.push({ connectionId: connection.id, points: route });
  }

  return {
    outcome: "ready",
    placements,
    routes,
    assemblySequence: [...request.graph.assemblySequence].sort((left, right) => left.order - right.order),
  };
}
