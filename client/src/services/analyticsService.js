import api from "./api";
export const getAnalyticsData=async(month,year)=>(await api.get("/analytics",{params:{month,year}})).data;
