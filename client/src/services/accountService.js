import api from "./api";
export const getAccounts=async()=>(await api.get("/accounts")).data;
export const addAccount=async(data)=>(await api.post("/accounts",data)).data;
export const updateAccount=async(id,data)=>(await api.put(`/accounts/${id}`,data)).data;
export const deleteAccount=async(id)=>(await api.delete(`/accounts/${id}`)).data;
export const getAccountTransactions=async(id)=>(await api.get(`/accounts/${id}/transactions`)).data;
