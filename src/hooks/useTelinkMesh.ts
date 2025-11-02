import { useTelinkMeshContext } from '../context/TelinkMeshContext';

/**
 * useTelinkMesh - Main hook for accessing Telink mesh network operations
 *
 * This is a convenience re-export of useTelinkMeshContext
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     nodes,
 *     isInitialized,
 *     initializeNetwork,
 *     refreshNodes
 *   } = useTelinkMesh();
 *
 *   return <View>...</View>;
 * }
 * ```
 */
export const useTelinkMesh = useTelinkMeshContext;

export default useTelinkMesh;
