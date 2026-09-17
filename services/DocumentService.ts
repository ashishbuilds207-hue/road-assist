import {
  getSupabase,
  ok,
  fail,
  isMissingRelationError,
} from '@/services/_helpers'
import type { ServiceResult } from '@/services/_helpers'

export type DocumentMeta = {
  id: string
  name: string
  path: string
  bucket: string
  mime_type: string | null
  size: number | null
  entity_type: string | null
  entity_id: string | null
  uploaded_by: string | null
  created_at: string
  public_url?: string | null
}

const DEFAULT_BUCKET = 'rsa-documents'

export const DocumentService = {
  async list(params?: {
    entity_type?: string
    entity_id?: string
    limit?: number
  }): Promise<ServiceResult<DocumentMeta[]>> {
    try {
      const supabase = getSupabase()
      let query = supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(params?.limit ?? 50)

      if (params?.entity_type) query = query.eq('entity_type', params.entity_type)
      if (params?.entity_id) query = query.eq('entity_id', params.entity_id)

      const { data, error } = await query
      if (error) {
        if (isMissingRelationError(error)) return ok([])
        return fail([], error.message)
      }
      return ok((data as DocumentMeta[]) ?? [])
    } catch (e) {
      return fail([], e)
    }
  },

  async upload(input: {
    file: File | Blob
    fileName: string
    entity_type?: string
    entity_id?: string
    uploaded_by?: string
    bucket?: string
  }): Promise<ServiceResult<DocumentMeta | null>> {
    try {
      const supabase = getSupabase()
      const bucket = input.bucket ?? DEFAULT_BUCKET
      const path = `${input.entity_type ?? 'general'}/${input.entity_id ?? 'misc'}/${Date.now()}-${input.fileName}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, input.file, { upsert: false })

      if (uploadError) {
        return fail(null, uploadError.message)
      }

      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path)

      const meta: Omit<DocumentMeta, 'id' | 'created_at'> & {
        created_at?: string
      } = {
        name: input.fileName,
        path,
        bucket,
        mime_type: input.file.type || null,
        size: 'size' in input.file ? (input.file as File).size : null,
        entity_type: input.entity_type ?? null,
        entity_id: input.entity_id ?? null,
        uploaded_by: input.uploaded_by ?? null,
        public_url: publicData.publicUrl,
      }

      const { data, error } = await supabase
        .from('documents')
        .insert(meta as never)
        .select()
        .single()

      if (error) {
        if (isMissingRelationError(error)) {
          return ok({
            id: `local-${Date.now()}`,
            created_at: new Date().toISOString(),
            ...meta,
          } as DocumentMeta)
        }
        return fail(null, error.message)
      }
      return ok(data as DocumentMeta)
    } catch (e) {
      return fail(null, e)
    }
  },

  async getSignedUrl(
    path: string,
    bucket = DEFAULT_BUCKET,
    expiresIn = 3600
  ): Promise<ServiceResult<string | null>> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn)

      if (error) return fail(null, error.message)
      return ok(data.signedUrl)
    } catch (e) {
      return fail(null, e)
    }
  },

  async remove(
    id: string,
    path?: string,
    bucket = DEFAULT_BUCKET
  ): Promise<ServiceResult<boolean>> {
    try {
      const supabase = getSupabase()
      if (path) {
        await supabase.storage.from(bucket).remove([path])
      }
      const { error } = await supabase.from('documents').delete().eq('id', id)
      if (error) {
        if (isMissingRelationError(error)) return ok(false)
        return fail(false, error.message)
      }
      return ok(true)
    } catch (e) {
      return fail(false, e)
    }
  },
}
