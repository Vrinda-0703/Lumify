import api from "./api";
export const getDashboardData=async()=>(await api.get("/dashboard")).data;
