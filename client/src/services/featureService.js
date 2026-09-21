import api from "./api";

const make = (path) => ({
    list: async (params) => (await api.get(`/${path}`, { params })).data,
    get: async (id) => (await api.get(`/${path}/${id}`)).data,
    create: async (data) => (await api.post(`/${path}`, data)).data,
    update: async (id, data) => (await api.put(`/${path}/${id}`, data)).data,
    remove: async (id) => (await api.delete(`/${path}/${id}`)).data,
});

export const billService = make("bills");
export const goalService = {
    ...make("goals"),
    contribute: async (id, amount, date, note = "") =>
        (await api.post(`/goals/${id}/contribute`, { amount, date, note })).data,
};
export const subscriptionService = make("subscriptions");
export const categoryService = make("categories");

export const sharedBudgetService = {
    list: async () => (await api.get("/shared-budgets")).data,
    create: async (d) => (await api.post("/shared-budgets", d)).data,
    update: async (id, d) => (await api.put(`/shared-budgets/${id}`, d)).data,
    remove: async (id) => (await api.delete(`/shared-budgets/${id}`)).data,
    invite: async (id, email) => (await api.post(`/shared-budgets/${id}/invite`, { email })).data,
    respond: async (id, status) => (await api.post(`/shared-budgets/${id}/respond`, { status })).data,
    contribute: async (id, amount) => (await api.post(`/shared-budgets/${id}/contribute`, { amount })).data,
    removeMember: async (id, userId) => (await api.delete(`/shared-budgets/${id}/members/${userId}`)).data,
    leave: async (id) => (await api.post(`/shared-budgets/${id}/leave`)).data,
    getInvitation: async (token) => (await api.get(`/shared-budgets/invitation/${token}`)).data,
    respondByToken: async (token, status) => (await api.post(`/shared-budgets/invitation/${token}/respond`, { status })).data,
};

export const calendarService = {
    list: async () => (await api.get("/calendar")).data,
};

export const aiService = {
    ask: async (query) => (await api.post("/ai/ask", { query })).data,
    purchase: async (data) => (await api.post("/ai/purchase", data)).data,
    voice: async (text) => (await api.post("/ai/voice", { text })).data,
};

export const receiptService = {
    extract: async (file) => {
        const fd = new FormData();
        fd.append("receipt", file);
        return (
            await api.post("/receipts/extract", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            })
        ).data;
    },
};
