import api from "./api";

export const getBudgets = async (month, year) => (await api.get("/budgets", { params: { month, year } })).data;
export const addBudget = async (data) => (await api.post("/budgets", data)).data;
export const updateBudget = async (id, data) => (await api.put(`/budgets/${id}`, data)).data;
export const deleteBudget = async (id) => (await api.delete(`/budgets/${id}`)).data;
