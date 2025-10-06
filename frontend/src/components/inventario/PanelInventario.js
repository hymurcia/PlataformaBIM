import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Table,
  Button,
  Form,
  Spinner,
  Modal,
  Tabs,
  Tab,
  Image,
  Badge,
  Container,
  Card,
  Row,
  Col,
} from "react-bootstrap";

// URLs desde .env o fallback
const API_URL_ITEMS = process.env.REACT_APP_API_URL_ITEMS || "http://localhost:5000/items";
const API_URL_INVENTARIO = process.env.REACT_APP_API_URL_INVENTARIO || "http://localhost:5000/inventario";

const InventarioItems = () => {
  const [items, setItems] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Items
  const [showModalItem, setShowModalItem] = useState(false);
  const [editandoItem, setEditandoItem] = useState(null);
  const [formItem, setFormItem] = useState({
    id: null,
    nombre: "",
    descripcion: "",
    categoria_id: "",
    ubicacion_default: "Almacén",
    vida_util_meses: "",
    imagen: null,
    imagen_url: "",
  });

  // Modal Inventario
  const [showModalInventario, setShowModalInventario] = useState(false);
  const [nuevoInventario, setNuevoInventario] = useState({
    item_id: "",
    cantidad: 0,
    costo_unitario: 0,
    ubicacion_actual: "Almacén",
  });

  const [editandoInv, setEditandoInv] = useState(null);
  const [formInv, setFormInv] = useState({});

  // Modal Preview Imagen
  const [showModalImagen, setShowModalImagen] = useState(false);
  const [imagenPreview, setImagenPreview] = useState(null);

  // Categorías
  const categorias = [
    { id: 1, nombre: "Eléctrico" },
    { id: 2, nombre: "Hidráulico / Plomería" },
    { id: 3, nombre: "Pintura y Acabados" },
    { id: 4, nombre: "Mobiliario" },
    { id: 5, nombre: "Cerrajería" },
    { id: 6, nombre: "Iluminación" },
    { id: 7, nombre: "Redes / Infraestructura TIC" },
    { id: 8, nombre: "Otros" },
  ];

  // Fetch Items + Inventario
  const fetchData = async () => {
    try {
      const resItems = await axios.get(API_URL_ITEMS);
      //console.log("📥 Items cargados:", resItems.data);
      setItems(resItems.data);

      // Mapeamos para unir inventario con items
      const dataInv = resItems.data.map((item) => ({
        inventario_id: item.inventario_id || null, // id del inventario si existe
        item_id: item.id, // id del item
        nombre: item.nombre,
        vida_util: item.vida_util_meses,
        cantidad: item.cantidad || 0,
        costo_unitario: item.costo_unitario
          ? parseFloat(item.costo_unitario)
          : 0,
        ubicacion_actual: item.ubicacion_actual || "Almacén",
        fecha_actualizacion: item.fecha_actualizacion || "",
        categoria: item.categoria_id,
      }));
      //console.log("📦 Inventario mapeado:", dataInv);
      setInventario(dataInv);
    } catch (err) {
      console.error("❌ Error cargando data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // CRUD Items
  const handleItemChange = (e) => {
    setFormItem({
      ...formItem,
      [e.target.name]:
        e.target.type === "file" ? e.target.files[0] : e.target.value,
    });
  };

  const guardarItem = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(formItem).forEach((key) => {
      if (formItem[key] !== null) data.append(key, formItem[key]);
    });
   // console.log("📤 Datos item a enviar:", Object.fromEntries(data.entries()));
    try {
      if (editandoItem) {
        await axios.put(`${API_URL_ITEMS}/${formItem.id}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
       // console.log("✅ Item actualizado");
      } else {
        await axios.post(API_URL_ITEMS, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
       // console.log("✅ Item creado");
      }
      setShowModalItem(false);
      setEditandoItem(null);
      setFormItem({
        id: null,
        nombre: "",
        descripcion: "",
        categoria_id: "",
        ubicacion_default: "Almacén",
        vida_util_meses: "",
        imagen: null,
        imagen_url: "",
      });
      fetchData();
    } catch (err) {
      console.error("❌ Error guardando item:", err);
    }
  };

  const eliminarItem = async (id) => {
    if (window.confirm("¿Eliminar este item?")) {
      try {
        await axios.delete(`${API_URL_ITEMS}/${id}`);
      //  console.log("🗑️ Item eliminado:", id);
        fetchData();
      } catch (err) {
        console.error("❌ Error eliminando item:", err);
      }
    }
  };

  // CRUD Inventario
  const handleInvChange = (e) => {
    setFormInv({
      ...formInv,
      [e.target.name]: e.target.value,
      ubicacion_actual: "Almacén",
    });
  };

  const guardarInventario = async (item_id) => {
   // console.log("📤 Actualizando inventario de item_id:", item_id, "con datos:", formInv);
    try {
      await axios.put(`${API_URL_INVENTARIO}/${item_id}`, formInv);
     // console.log("✅ Inventario actualizado para item_id:", item_id);
      setEditandoInv(null);
      fetchData();
    } catch (err) {
      console.error("❌ Error actualizando inventario:", err);
    }
  };

  const handleNuevoInvChange = (e) => {
    setNuevoInventario({
      ...nuevoInventario,
      [e.target.name]: e.target.value,
      ubicacion_actual: "Almacén",
    });
  };

  const crearInventario = async () => {
   // console.log("📤 Creando inventario nuevo:", nuevoInventario);
    try {
      await axios.post(API_URL_INVENTARIO, nuevoInventario);
     // console.log("✅ Inventario creado");
      setShowModalInventario(false);
      setNuevoInventario({
        item_id: "",
        cantidad: 0,
        costo_unitario: 0,
        ubicacion_actual: "Almacén",
      });
      fetchData();
    } catch (err) {
      console.error("❌ Error ingresando al inventario:", err);
    }
  };

  const abrirPreviewImagen = (url) => {
    setImagenPreview(url);
    setShowModalImagen(true);
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;

  return (
    <Container className="mt-4">
      <Card className="shadow-lg p-4 rounded-4" style={{ backgroundColor: "#f8f9fa" }}>
        <h2 className="text-center mb-4" style={{ color: "#00482B", fontWeight: "bold" }}>⚙️ Módulo de Inventario y Items</h2>

        <Tabs defaultActiveKey="inventario" className="mb-3" fill>
          {/* TAB INVENTARIO */}
          <Tab eventKey="inventario" title="📦 Inventario">
            <div className="d-flex justify-content-end mb-2">
              <Button variant="success" onClick={() => setShowModalInventario(true)}>➕ Ingresar al Inventario</Button>
            </div>
            <Table striped bordered hover responsive className="align-middle">
              <thead className="table-dark">
                <tr>
                  <th>Item</th>
                  <th>Vida Útil</th>
                  <th>Categoría</th>
                  <th>Cantidad</th>
                  <th>Costo Unitario</th>
                  <th>Ubicación</th>
                  <th>Última Actualización</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inventario.map((inv) => (
                  <tr key={inv.item_id}>
                    <td>{inv.nombre}</td>
                    <td>{inv.vida_util ? `${inv.vida_util} meses` : "—"}</td>
                    <td>{categorias.find((c) => c.id == inv.categoria)?.nombre || "—"}</td>
                    <td>
                      {editandoInv === inv.item_id ? (
                        <Form.Control type="number" name="cantidad" defaultValue={inv.cantidad} onChange={handleInvChange} />
                      ) : (
                        inv.cantidad
                      )}
                    </td>
                    <td>
                      {editandoInv === inv.item_id ? (
                        <Form.Control type="number" step="0.01" name="costo_unitario" defaultValue={inv.costo_unitario} onChange={handleInvChange} />
                      ) : (
                        <Badge bg="info">${Number(inv.costo_unitario).toFixed(2)}</Badge>
                      )}
                    </td>
                    <td>{inv.ubicacion_actual}</td>
                    <td>{inv.fecha_actualizacion ? new Date(inv.fecha_actualizacion).toLocaleString() : "—"}</td>
                    <td>
                      {editandoInv === inv.item_id ? (
                        <>
                          <Button variant="success" size="sm" onClick={() => guardarInventario(inv.item_id)}>💾 Guardar</Button>{" "}
                          <Button variant="secondary" size="sm" onClick={() => setEditandoInv(null)}>✖ Cancelar</Button>
                        </>
                      ) : (
                        <Button variant="primary" size="sm" onClick={() => { setEditandoInv(inv.item_id); setFormInv({ cantidad: inv.cantidad, costo_unitario: inv.costo_unitario }); }}>✏️ Editar</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab>

          {/* TAB ITEMS */}
          <Tab eventKey="items" title="🛠️ Items">
            <div className="d-flex justify-content-end mb-2">
              <Button variant="success" onClick={() => setShowModalItem(true)}>➕ Nuevo Item</Button>
            </div>
            <Table striped bordered hover responsive className="align-middle">
              <thead className="table-dark">
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Ubicación</th>
                  <th>Vida Útil</th>
                  <th>Imagen</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nombre}</td>
                    <td>{item.descripcion}</td>
                    <td>{categorias.find((c) => c.id == item.categoria_id)?.nombre || "—"}</td>
                    <td>Almacén</td>
                    <td>{item.vida_util_meses ? `${item.vida_util_meses} meses` : "—"}</td>
                    <td>
                      {item.imagen_url ? (
                        <Image
                          src={`${process.env.REACT_APP_API_URL_BASE || "http://localhost:5000"}${item.imagen_url}`}
                          alt={item.nombre}
                          width={60}
                          style={{ cursor: "pointer" }}
                          onClick={() => abrirPreviewImagen(`${process.env.REACT_APP_API_URL_BASE || "http://localhost:5000"}${item.imagen_url}`)}
                          thumbnail
                        />
                      ) : "Sin imagen"}
                    </td>
                    <td>
                      <Button variant="warning" size="sm" onClick={() => { setEditandoItem(item.id); setFormItem({ ...item, id: item.id, imagen: null, imagen_url: item.imagen_url || "" }); setShowModalItem(true); }}>✏️ Editar</Button>{" "}
                      <Button variant="danger" size="sm" onClick={() => eliminarItem(item.id)}>🗑️ Eliminar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab>
        </Tabs>
      </Card>

      {/* Modal Crear/Editar Item */}
      <Modal show={showModalItem} onHide={() => setShowModalItem(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editandoItem ? "Editar Item" : "Nuevo Item"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={guardarItem}>
            <Form.Group className="mb-2">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                name="nombre"
                value={formItem.nombre}
                onChange={handleItemChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="descripcion"
                value={formItem.descripcion}
                onChange={handleItemChange}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Categoría</Form.Label>
              <Form.Select
                name="categoria_id"
                value={formItem.categoria_id}
                onChange={handleItemChange}
              >
                <option value="">-- Selecciona Categoría --</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Vida útil (meses)</Form.Label>
              <Form.Control
                type="number"
                name="vida_util_meses"
                value={formItem.vida_util_meses}
                onChange={handleItemChange}
              />
            </Form.Group>
            {formItem.imagen_url && (
              <div className="mb-2 text-center">
                <p>Imagen actual:</p>
                <Image
                  src={`http://localhost:5000${formItem.imagen_url}`}
                  alt="Actual"
                  width={100}
                  thumbnail
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    abrirPreviewImagen(
                      `http://localhost:5000${formItem.imagen_url}`
                    )
                  }
                />
              </div>
            )}
            <Form.Group className="mb-2">
              <Form.Label>Cambiar Imagen</Form.Label>
              <Form.Control type="file" name="imagen" onChange={handleItemChange} />
            </Form.Group>
            <div className="text-end">
              <Button variant="success" type="submit">{editandoItem ? "Actualizar" : "Crear"}</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal Ingresar Inventario */}
      <Modal
        show={showModalInventario}
        onHide={() => setShowModalInventario(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>➕ Ingresar al Inventario</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Selecciona un Item</Form.Label>
              <Form.Select
                name="item_id"
                value={nuevoInventario.item_id}
                onChange={handleNuevoInvChange}
              >
                <option value="">-- Selecciona --</option>
                {items.map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.vida_util_meses} meses)</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Cantidad</Form.Label>
              <Form.Control
                type="number"
                name="cantidad"
                value={nuevoInventario.cantidad}
                onChange={handleNuevoInvChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Costo Unitario</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                name="costo_unitario"
                value={nuevoInventario.costo_unitario}
                onChange={handleNuevoInvChange}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowModalInventario(false)}
          >
            Cancelar
          </Button>
          <Button variant="primary" onClick={crearInventario}>
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Preview Imagen */}
      <Modal
        show={showModalImagen}
        onHide={() => setShowModalImagen(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Vista Previa</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {imagenPreview && (
            <Image
              src={imagenPreview}
              alt="Preview"
              style={{ maxWidth: "100%", maxHeight: "500px" }}
              thumbnail
            />
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default InventarioItems;
