import api from "./api";
export const signup=async(data)=>(await api.post("/auth/signup",data)).data;
export const login=async(data)=>(await api.post("/auth/login",data)).data;
