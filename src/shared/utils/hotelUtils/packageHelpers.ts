export const extractPackageId = (payload: any): number | null => {
  if (!payload) {
    return null;
  }

  const candidate =
    payload.package_id ??
    payload.id ??
    payload.package?.id ??
    payload.package?.package_id ??
    payload.package?.packageId ??
    payload.package?.package?.id;

  if (typeof candidate === 'number' && !Number.isNaN(candidate)) {
    return candidate;
  }

  if (typeof candidate === 'string') {
    const parsed = parseInt(candidate, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const nested = extractPackageId(item);
      if (nested) {
        return nested;
      }
    }
  }

  if (typeof payload === 'object') {
    for (const value of Object.values(payload)) {
      const nested = extractPackageId(value);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
};

