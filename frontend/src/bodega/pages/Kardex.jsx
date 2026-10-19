import KardexInventario from "../../components/KardexInventario.jsx";
import { useBodega } from "../store.jsx";

export default function Kardex() {
  const { idSucursal, nombreSucursal } = useBodega();
  const sucursales = idSucursal ? [{ idSucursal, nombreSucursal }] : [];
  return <KardexInventario idSucursalFija={idSucursal} sucursales={sucursales} />;
}
