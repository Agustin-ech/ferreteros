import KardexInventario from "../../components/KardexInventario.jsx";
import { useBodega } from "../store.jsx";

export default function Kardex() {
  const { idSucursalActual, sucursales } = useBodega();
  return <KardexInventario idSucursalFija={idSucursalActual} sucursales={sucursales} />;
}
