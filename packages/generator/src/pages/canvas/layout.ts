import type { Node } from 'reactflow';
import { GAP, MIN_GAP, SECTION_HEIGHT, SECTION_WIDTH, CARD_WIDTH, getMinCardHeight } from './constants';

// Stores a stable, component IDs per section (keyed by raw section id)
let globalLayoutOrder: Record<string, string[]> = {};
export const setGlobalLayoutOrder = (val: Record<string, string[]>) => {
  globalLayoutOrder = val || {};
};

export function reflowAllSections(previousNodes: Node[]): Node[] {
  const outputNodes = [...previousNodes];
  const sections = outputNodes.filter(nodeItem => nodeItem.type === 'sectionNode');

  for (const section of sections) {
    const sectionWidth = (section.style?.width as number) ?? SECTION_WIDTH;
    const children = outputNodes.filter(nodeItem => nodeItem.parentNode === section.id && nodeItem.type === 'componentNode');

    if (children.length === 0) continue;
    const innerWidth = sectionWidth - GAP * 2;

    const occupiedSpaces: Array<{ x: number; y: number; w: number; h: number }> = [];

    let maxBottom = GAP;

    // Scan a coarse grid from top-left to bottom-right for the first free spot
    const findBestPosition = (width: number, height: number): { x: number; y: number } => {
      const stepY = GAP;
      const stepX = 4;

      for (let y = GAP; y <= maxBottom + GAP; y += stepY) {
        for (let x = GAP; x + width <= innerWidth; x += stepX) {
          const hasConflict = occupiedSpaces.some(
            occupied => !(x >= occupied.x + occupied.w || x + width + GAP <= occupied.x || y >= occupied.y + occupied.h || y + height + GAP <= occupied.y),
          );
          if (!hasConflict) return { x, y };
        }
      }
      return { x: GAP, y: maxBottom };
    };

    // After initial placement, nudge any overlapping pairs by re-placing the second one
    const fixOverlapsInReflow = () => {
      let hasFixed = false;
      for (let i = 0; i < children.length; i++) {
        for (let j = i + 1; j < children.length; j++) {
          const firstNode = children[i];
          const secondNode = children[j];
          const firstPosition = firstNode.position as { x: number; y: number };
          const secondPosition = secondNode.position as { x: number; y: number };
          const firstWidth = (firstNode.style?.width as number) ?? CARD_WIDTH;
          const firstHeight = (firstNode.style?.height as number) ?? getMinCardHeight((firstNode as any)?.data?.comp);
          const secondWidth = (secondNode.style?.width as number) ?? CARD_WIDTH;
          const secondHeight = (secondNode.style?.height as number) ?? getMinCardHeight((secondNode as any)?.data?.comp);

          const hasOverlap = !(
            firstPosition.x + firstWidth + MIN_GAP <= secondPosition.x ||
            secondPosition.x + secondWidth + MIN_GAP <= firstPosition.x ||
            firstPosition.y + firstHeight + MIN_GAP <= secondPosition.y ||
            secondPosition.y + secondHeight + MIN_GAP <= firstPosition.y
          );

          if (hasOverlap) {
            // Re-seat the second node to the next best available slot
            const newPosition = findBestPosition(secondWidth, secondHeight);
            secondNode.position = { x: newPosition.x, y: newPosition.y } as any;
            occupiedSpaces.push({ x: newPosition.x, y: newPosition.y, w: secondWidth + GAP, h: secondHeight + GAP });
            maxBottom = Math.max(maxBottom, newPosition.y + secondHeight + GAP);
            hasFixed = true;
          }
        }
      }
      return hasFixed;
    };

    // Sort children by stored layout order
    sortChildrenByLayoutOrder(children, (section.id as string).replace(/^sec:/, ''));

    // Initial placement pass
    for (const child of children) {
      const childWidth = (child.style?.width as number) ?? CARD_WIDTH;
      const childHeight = (child.style?.height as number) ?? getMinCardHeight((child as any)?.data?.comp);
      const position = findBestPosition(childWidth, childHeight);

      child.position = { x: position.x, y: position.y } as any;
      occupiedSpaces.push({ x: position.x, y: position.y, w: childWidth + GAP, h: childHeight + GAP });
      maxBottom = Math.max(maxBottom, position.y + childHeight + GAP);
    }

    // Attempt overlap-fix iterations
    let attempts = 0;
    while (fixOverlapsInReflow() && attempts < 3) {
      attempts++;
    }

    // Expand section to fit its tallest content while respecting a minimum height
    section.style = { ...section.style, height: Math.max(SECTION_HEIGHT, maxBottom) } as any;
  }

  return outputNodes;
}

export function sortChildrenByLayoutOrder(children: Node[], sectionId: string) {
  const layoutOrder = globalLayoutOrder[sectionId];
  children.sort((firstNode, secondNode) => {
    if (layoutOrder && layoutOrder.length) {
      const firstIndex = layoutOrder.indexOf(firstNode.id);
      const secondIndex = layoutOrder.indexOf(secondNode.id);
      if (firstIndex !== -1 || secondIndex !== -1) {
        if (firstIndex === -1) return 1;
        if (secondIndex === -1) return -1;
        return firstIndex - secondIndex;
      }
    }
    // Fallback: top-to-bottom, then left-to-right
    return firstNode.position.y - secondNode.position.y || firstNode.position.x - secondNode.position.x;
  });
}
