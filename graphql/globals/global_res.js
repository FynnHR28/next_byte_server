

export const timestampsToDateResolver = {
    created_at: (obj) => new Date(obj.created_at).toISOString().split('T')[0],
    updated_at: (obj) => new Date(obj.updated_at).toISOString().split('T')[0]
}
