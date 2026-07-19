export { embedText, embedTexts, isEmbeddingsConfigured } from '@/lib/ai/embeddings'
export { indexDocument, indexPlainDocument, deleteDocumentsForSource } from './index-document'
export { retrieveRagChunks, formatRagContextBlock } from './retrieve'
export {
  formatWorkoutChunk,
  formatMealChunk,
  formatBodyCompositionChunk,
  formatExerciseChunk,
  formatPrChunk,
} from './formatters'
export type { RagSourceType, RagChunkInput, RetrievedChunk } from './types'
export { chunkText, getRagTopK } from './types'
