const prisma = require('../../config/db');
const {
  BadRequestError,
  NotFoundError,
  ConflictError,
} = require('../../utils/errors');

class IntelligenceService {
  /**
   * Lists all license types with prerequisites, dependents, and state rules
   */
  async getLicenseTypes() {
    return await prisma.licenseType.findMany({
      include: {
        prerequisite_for: {
          include: {
            license_type: { select: { id: true, name: true, code: true } },
          },
        },
        dependent_on: {
          include: {
            prerequisite_license_type: { select: { id: true, name: true, code: true } },
          },
        },
        license_type_rules: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Retrieves single license type by ID with its dependency details
   */
  async getLicenseTypeById(id) {
    const licenseType = await prisma.licenseType.findUnique({
      where: { id },
      include: {
        dependent_on: {
          include: { prerequisite_license_type: true },
        },
        prerequisite_for: {
          include: { license_type: true },
        },
        license_type_rules: true,
        required_license_types: true,
      },
    });

    if (!licenseType) {
      throw new NotFoundError(`License type with ID ${id} not found`);
    }

    return licenseType;
  }

  /**
   * Create a new license type
   */
  async createLicenseType(data) {
    const existing = await prisma.licenseType.findUnique({
      where: { code: data.code.toUpperCase().trim() },
    });

    if (existing) {
      throw new ConflictError(`License type with code '${data.code}' already exists`);
    }

    return await prisma.licenseType.create({
      data: {
        name: data.name.trim(),
        code: data.code.toUpperCase().trim(),
        description: data.description || null,
        issuing_authority: data.issuing_authority || null,
        default_validity_months: data.default_validity_months ? parseInt(data.default_validity_months, 10) : null,
        is_lifetime_valid: Boolean(data.is_lifetime_valid),
      },
    });
  }

  /**
   * Lists all statutory dependency links
   */
  async getDependencies() {
    return await prisma.dependency.findMany({
      include: {
        license_type: {
          select: { id: true, name: true, code: true, is_lifetime_valid: true },
        },
        prerequisite_license_type: {
          select: { id: true, name: true, code: true, is_lifetime_valid: true },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * Create a new dependency rule with circular dependency validation
   */
  async createDependency({ licenseTypeId, prerequisiteLicenseTypeId, isBlocking = true }) {
    if (licenseTypeId === prerequisiteLicenseTypeId) {
      throw new BadRequestError('A license cannot depend on itself');
    }

    // Verify both license types exist
    const [target, prereq] = await Promise.all([
      prisma.licenseType.findUnique({ where: { id: licenseTypeId } }),
      prisma.licenseType.findUnique({ where: { id: prerequisiteLicenseTypeId } }),
    ]);

    if (!target) throw new NotFoundError('Target license type not found');
    if (!prereq) throw new NotFoundError('Prerequisite license type not found');

    // Cycle detection: Check if prerequisite already depends on target (directly or transitively)
    const hasCycle = await this._detectCycle(prerequisiteLicenseTypeId, licenseTypeId);
    if (hasCycle) {
      throw new ConflictError(
        `Cannot create dependency: Circular reference detected between '${target.code}' and '${prereq.code}'`
      );
    }

    try {
      return await prisma.dependency.create({
        data: {
          license_type_id: licenseTypeId,
          prerequisite_license_type_id: prerequisiteLicenseTypeId,
          is_blocking: Boolean(isBlocking),
        },
        include: {
          license_type: true,
          prerequisite_license_type: true,
        },
      });
    } catch (err) {
      if (err.code === 'P2002') {
        throw new ConflictError('This dependency relationship already exists');
      }
      throw err;
    }
  }

  /**
   * Delete a dependency rule
   */
  async deleteDependency(id) {
    const dep = await prisma.dependency.findUnique({ where: { id } });
    if (!dep) {
      throw new NotFoundError('Dependency not found');
    }

    await prisma.dependency.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Helper to detect directed cycles in the dependency graph using BFS
   */
  async _detectCycle(startNodeId, targetNodeId) {
    const visited = new Set();
    const queue = [startNodeId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === targetNodeId) return true;

      if (!visited.has(current)) {
        visited.add(current);
        const dependencies = await prisma.dependency.findMany({
          where: { license_type_id: current },
          select: { prerequisite_license_type_id: true },
        });

        for (const dep of dependencies) {
          queue.push(dep.prerequisite_license_type_id);
        }
      }
    }

    return false;
  }

  /**
   * Get all required rules filtered by location type and state
   */
  async getRequiredRules({ locationType, state } = {}) {
    const where = {};
    if (locationType) where.location_type = locationType;
    if (state) {
      where.OR = [{ state: null }, { state }];
    }

    return await prisma.requiredLicenseType.findMany({
      where,
      include: {
        license_type: true,
      },
    });
  }

  /**
   * Global dependency graph (Nodes & Edges for graph visualizers)
   */
  async getGlobalDependencyGraph() {
    const [licenseTypes, dependencies] = await Promise.all([
      prisma.licenseType.findMany(),
      prisma.dependency.findMany({
        include: {
          license_type: { select: { id: true, code: true, name: true } },
          prerequisite_license_type: { select: { id: true, code: true, name: true } },
        },
      }),
    ]);

    const nodes = licenseTypes.map((lt) => ({
      id: lt.id,
      code: lt.code,
      label: lt.name,
      authority: lt.issuing_authority,
      isLifetimeValid: lt.is_lifetime_valid,
      validityMonths: lt.default_validity_months,
    }));

    const edges = dependencies.map((d) => ({
      id: d.id,
      source: d.prerequisite_license_type_id,
      sourceCode: d.prerequisite_license_type.code,
      target: d.license_type_id,
      targetCode: d.license_type.code,
      isBlocking: d.is_blocking,
    }));

    return { nodes, edges };
  }

  /**
   * Evaluates location-specific dependency graph with live document statuses & cascading blocks
   * @param {string} locationId
   * @param {string} orgId
   */
  async getLocationDependencyGraph(locationId, orgId) {
    const location = await prisma.location.findFirst({
      where: { id: locationId, org_id: orgId },
    });

    if (!location) {
      throw new NotFoundError('Location not found');
    }

    // 1. Fetch all license types, dependencies, and documents
    const [licenseTypes, dependencies, documents, requiredLicenses] = await Promise.all([
      prisma.licenseType.findMany(),
      prisma.dependency.findMany({
        include: {
          license_type: true,
          prerequisite_license_type: true,
        },
      }),
      prisma.document.findMany({
        where: {
          org_id: orgId,
          OR: [{ location_id: locationId }, { location_id: null }],
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.requiredLicenseType.findMany({
        where: {
          location_type: location.type,
          OR: [{ state: null }, { state: location.state }],
        },
      }),
    ]);

    const requiredLicenseSet = new Set(requiredLicenses.map((r) => r.license_type_id));

    // Map latest document per license type
    const docMap = new Map();
    for (const doc of documents) {
      if (!docMap.has(doc.license_type_id)) {
        docMap.set(doc.license_type_id, doc);
      }
    }

    const now = new Date();

    // 2. Compute individual node health statuses (pre-cascading)
    const nodeStatusMap = new Map();
    for (const lt of licenseTypes) {
      const doc = docMap.get(lt.id);
      let status = 'MISSING';
      let daysRemaining = null;

      if (doc) {
        if (doc.status === 'REJECTED') {
          status = 'REJECTED';
        } else if (doc.status === 'PENDING_VERIFICATION') {
          status = 'PENDING';
        } else if (lt.is_lifetime_valid) {
          status = 'VALID';
        } else if (doc.expiry_date) {
          const diffMs = new Date(doc.expiry_date).getTime() - now.getTime();
          daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          if (daysRemaining <= 0 || doc.status === 'EXPIRED') {
            status = 'EXPIRED';
          } else if (daysRemaining <= 30) {
            status = 'EXPIRING_SOON';
          } else {
            status = 'VALID';
          }
        } else {
          status = 'VALID';
        }
      }

      nodeStatusMap.set(lt.id, {
        id: lt.id,
        code: lt.code,
        name: lt.name,
        isMandatory: requiredLicenseSet.has(lt.id),
        isLifetimeValid: lt.is_lifetime_valid,
        rawStatus: status,
        daysRemaining,
        document: doc ? { id: doc.id, fileName: doc.file_name, status: doc.status } : null,
      });
    }

    // 3. Build Adjacency List for Dependency Traversal (Prerequisite -> Dependents)
    // dep: license_type_id depends on prerequisite_license_type_id
    const incomingPrereqs = new Map(); // target -> [prereqId, ...]
    for (const dep of dependencies) {
      if (!incomingPrereqs.has(dep.license_type_id)) {
        incomingPrereqs.set(dep.license_type_id, []);
      }
      incomingPrereqs.get(dep.license_type_id).push({
        prereqId: dep.prerequisite_license_type_id,
        isBlocking: dep.is_blocking,
      });
    }

    // 4. Propagate Cascading Blocks (Topological / Recursive check)
    const cascadingBlocks = new Map(); // targetId -> [{ prereqCode, prereqName, reason }]

    const isNodeUnhealthy = (nodeId) => {
      const info = nodeStatusMap.get(nodeId);
      if (!info) return true;
      return info.rawStatus === 'EXPIRED' || info.rawStatus === 'MISSING' || info.rawStatus === 'REJECTED';
    };

    // Check all nodes for cascading failures
    for (const lt of licenseTypes) {
      const prereqs = incomingPrereqs.get(lt.id) || [];
      const blockers = [];

      for (const p of prereqs) {
        if (p.isBlocking && isNodeUnhealthy(p.prereqId)) {
          const prereqNode = nodeStatusMap.get(p.prereqId);
          blockers.push({
            prereqId: p.prereqId,
            prereqCode: prereqNode?.code || 'UNKNOWN',
            prereqName: prereqNode?.name || 'Unknown License',
            reason: prereqNode?.rawStatus === 'EXPIRED' ? 'Prerequisite Expired' : 'Prerequisite Missing',
          });
        }
      }

      if (blockers.length > 0) {
        cascadingBlocks.set(lt.id, blockers);
      }
    }

    // 5. Build final annotated nodes & edges
    const nodes = licenseTypes.map((lt) => {
      const base = nodeStatusMap.get(lt.id);
      const blockers = cascadingBlocks.get(lt.id) || [];
      const isCascadingBlocked = blockers.length > 0;

      let effectiveStatus = base.rawStatus;
      if (isCascadingBlocked) {
        effectiveStatus = 'CASCADING_BLOCKED';
      }

      return {
        ...base,
        status: effectiveStatus,
        isCascadingBlocked,
        blockedBy: blockers,
      };
    });

    const edges = dependencies.map((d) => {
      const prereqInfo = nodeStatusMap.get(d.prerequisite_license_type_id);
      const isPrereqFailing = isNodeUnhealthy(d.prerequisite_license_type_id);

      return {
        id: d.id,
        source: d.prerequisite_license_type_id,
        sourceCode: d.prerequisite_license_type.code,
        target: d.license_type_id,
        targetCode: d.license_type.code,
        isBlocking: d.is_blocking,
        isTriggeringCascadingRisk: isPrereqFailing && d.is_blocking,
      };
    });

    // Extract active cascading risk chains for display
    const activeRiskChains = [];
    for (const [targetId, blockers] of cascadingBlocks.entries()) {
      const targetNode = nodeStatusMap.get(targetId);
      for (const blocker of blockers) {
        activeRiskChains.push({
          targetLicense: targetNode.name,
          targetCode: targetNode.code,
          blockedByCode: blocker.prereqCode,
          blockedByName: blocker.prereqName,
          reason: blocker.reason,
          recommendation: `Renew or upload ${blocker.prereqName} to unblock statutory compliance for ${targetNode.name}.`,
        });
      }
    }

    return {
      location: {
        id: location.id,
        name: location.name,
        type: location.type,
        state: location.state,
      },
      summary: {
        totalLicenses: nodes.length,
        mandatoryLicenses: nodes.filter((n) => n.isMandatory).length,
        cascadingBlockedCount: nodes.filter((n) => n.isCascadingBlocked).length,
        validCount: nodes.filter((n) => n.status === 'VALID').length,
        expiredCount: nodes.filter((n) => n.status === 'EXPIRED').length,
        missingCount: nodes.filter((n) => n.status === 'MISSING').length,
      },
      nodes,
      edges,
      activeRiskChains,
    };
  }
}

module.exports = new IntelligenceService();
