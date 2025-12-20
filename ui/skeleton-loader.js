// ui/skeleton-loader.js

class SkeletonLoader {
  constructor() {
    this.loaders = new Map();
  }

  show(containerId, type = 'default') {
    const container = document.getElementById(containerId);
    if (!container) return;

    let skeleton;
    switch (type) {
      case 'dashboard':
        skeleton = this.createDashboardSkeleton();
        break;
      case 'list':
        skeleton = this.createListSkeleton();
        break;
      case 'cards':
        skeleton = this.createCardsSkeleton();
        break;
      default:
        skeleton = this.createDefaultSkeleton();
    }

    container.innerHTML = skeleton;
    this.loaders.set(containerId, true);
  }

  hide(containerId) {
    this.loaders.delete(containerId);
  }

  createDefaultSkeleton() {
    return `
      <div class="skeleton-loader">
        <div class="skeleton-row"></div>
        <div class="skeleton-row"></div>
        <div class="skeleton-row"></div>
      </div>
    `;
  }

  createListSkeleton(count = 3) {
    const rows = Array(count).fill(0).map(() => `
      <div class="skeleton-list-item">
        <div class="skeleton-text skeleton-text-title"></div>
        <div class="skeleton-text skeleton-text-subtitle"></div>
      </div>
    `).join('');

    return `<div class="skeleton-loader">${rows}</div>`;
  }

  createCardsSkeleton(count = 4) {
    const cards = Array(count).fill(0).map(() => `
      <div class="skeleton-card">
        <div class="skeleton-circle"></div>
        <div class="skeleton-text skeleton-text-title"></div>
        <div class="skeleton-text skeleton-text-subtitle"></div>
      </div>
    `).join('');

    return `<div class="skeleton-cards-grid">${cards}</div>`;
  }

  createDashboardSkeleton() {
    return `
      <div class="skeleton-loader">
        <!-- Stats cards -->
        <div class="skeleton-stats-grid">
          ${Array(4).fill(0).map(() => `
            <div class="skeleton-stat-card">
              <div class="skeleton-circle"></div>
              <div class="skeleton-text skeleton-text-large"></div>
              <div class="skeleton-text skeleton-text-small"></div>
            </div>
          `).join('')}
        </div>

        <!-- Sections -->
        <div class="skeleton-section">
          <div class="skeleton-text skeleton-text-title"></div>
          ${this.createListSkeleton(3)}
        </div>

        <div class="skeleton-section">
          <div class="skeleton-text skeleton-text-title"></div>
          ${this.createListSkeleton(5)}
        </div>
      </div>
    `;
  }

  // Helper to wrap content with skeleton during loading
  async wrapWithLoader(containerId, asyncFunction, loaderType = 'default') {
    this.show(containerId, loaderType);
    
    try {
      await asyncFunction();
    } catch (error) {
      console.error('Error in wrapped function:', error);
    } finally {
      this.hide(containerId);
    }
  }

  isLoading(containerId) {
    return this.loaders.has(containerId);
  }

  clear() {
    this.loaders.clear();
  }
}

export default new SkeletonLoader();