import axios from "axios";
import { API_URL } from "./constants";

export const createNewStreamClient = async () => {
    return await axios.get(`${API_URL}/client`);
}