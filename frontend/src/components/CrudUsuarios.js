// src/components/CrudUsuarios.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Card,
  Table,
  Form,
  Button,
  Pagination,
  Row,
  Col,
  Modal,
  Alert,
  Spinner,
} from "react-bootstrap";

const CrudUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    password: "",
    rol_id: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [alertState, setAlertState] = useState({
    visible: false,
    variant: "success",
    message: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const navigate = useNavigate();

  // --- Cargar usuarios ---
  useEffect(() => {
    fetchUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  // --- Cargar roles ---
  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Ocultar alertas después de 5s ---
  useEffect(() => {
    if (!alertState.visible) return;
    const t = setTimeout(() => {
      setAlertState((s) => ({ ...s, visible: false }));
    }, 5000);
    return () => clearTimeout(t);
  }, [alertState.visible]);

  // --- Helpers ---
  const showAlert = (variant, message, show = true) => {
    setAlertState({ visible: show, variant, message });
  };

  const parseAxiosError = (error) => {
    try {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data || {};
        let message = `Error ${status}`;

        if (typeof data === "string") message = `${message}: ${data}`;
        else if (data.error) message = `${message}: ${data.error}`;
        else if (data.message) message = `${message}: ${data.message}`;
        else if (data.errors) {
          if (Array.isArray(data.errors)) message = data.errors.join("; ");
          else message = JSON.stringify(data.errors);
        } else {
          const pretty = Object.keys(data).length ? JSON.stringify(data) : "";
          message = `${message}${pretty ? `: ${pretty}` : ""}`;
        }

        return {
          message,
          fieldErrors: data.errors && typeof data.errors === "object" ? data.errors : {},
        };
      } else if (error.request) {
        return { message: "No hay respuesta del servidor.", fieldErrors: {} };
      } else {
        return { message: error.message || "Error desconocido.", fieldErrors: {} };
      }
    } catch (e) {
      return { message: "Error al parsear el error.", fieldErrors: {} };
    }
  };

  // --- Fetch usuarios ---
  const fetchUsuarios = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/admin/usuarios", {
        params: { search, page, limit },
        headers: { Authorization: `Bearer ${token}` },
      });

      setUsuarios(response.data.users || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      const parsed = parseAxiosError(error);
      showAlert("danger", `Error al obtener usuarios. ${parsed.message}`);
      if (error.response?.status === 401) navigate("/login");
      console.error("fetchUsuarios:", parsed);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fetch roles ---
  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/admin/roles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoles(response.data || []);
    } catch (error) {
      const parsed = parseAxiosError(error);
      showAlert("danger", `Error al obtener roles. ${parsed.message}`);
      console.error("fetchRoles:", parsed);
    }
  };

  // --- Abrir modal ---
  const handleOpenModal = (user = null) => {
    setFieldErrors({});
    if (user) {
      setEditingUser(user.id);
      setFormData({
        nombre: user.nombre || "",
        apellido: user.apellido || "",
        telefono: user.telefono || "",
        email: user.email || "",
        password: "",
        rol_id: user.rol_id || "",
      });
    } else {
      setEditingUser(null);
      setFormData({
        nombre: "",
        apellido: "",
        telefono: "",
        email: "",
        password: "",
        rol_id: "",
      });
    }
    setShowModal(true);
  };

  // --- Cerrar modal ---
  const handleCloseModal = () => {
    setShowModal(false);
    setFieldErrors({});
  };

  // --- Manejo de formulario ---
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- Validación cliente ---
  const clientValidate = () => {
    const errors = {};
    const emailRegex = /^[a-zA-Z0-9._%+-]+@midominio\.com$/;
    const telefonoRegex = /^\d{10}$/;

    if (!formData.nombre?.trim()) errors.nombre = "Nombre es requerido.";
    if (!formData.apellido?.trim()) errors.apellido = "Apellido es requerido.";
    if (!formData.telefono?.trim()) errors.telefono = "Teléfono es requerido.";
    else if (!telefonoRegex.test(formData.telefono)) errors.telefono = "El teléfono debe tener exactamente 10 dígitos.";
    if (!formData.email?.trim()) errors.email = "Email es requerido.";
    else if (!emailRegex.test(formData.email)) errors.email = "El correo debe ser del dominio @midominio.com.";
    if (!editingUser && !formData.password) errors.password = "Contraseña es requerida.";
    else if (!editingUser && formData.password.length < 6) errors.password = "La contraseña debe tener al menos 6 caracteres.";
    if (!formData.rol_id) errors.rol_id = "Seleccione un rol.";

    return errors;
  };

  // --- Guardar usuario ---
  const handleSave = async () => {
    setFieldErrors({});
    const validation = clientValidate();
    if (Object.keys(validation).length) {
      setFieldErrors(validation);
      showAlert("danger", "Corrige los errores del formulario.");
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      if (editingUser) {
        const res = await axios.put(
          `http://localhost:5000/admin/usuarios/${editingUser}`,
          {
            nombre: formData.nombre,
            apellido: formData.apellido,
            telefono: formData.telefono,
            email: formData.email,
            rol_id: formData.rol_id,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showAlert("success", `Usuario actualizado correctamente (${res.data.nombre || editingUser}).`);
      } else {
        const res = await axios.post(
          "http://localhost:5000/admin/usuarios",
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showAlert("success", `Usuario creado correctamente (${res.data.nombre || "sin nombre"}).`);
      }

      await fetchUsuarios();
      handleCloseModal();
    } catch (error) {
      const parsed = parseAxiosError(error);
      if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length) {
        setFieldErrors(parsed.fieldErrors);
      }
      showAlert("danger", `No se pudo guardar el usuario. ${parsed.message}`);
      console.error("handleSave:", parsed);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Eliminar usuario ---
  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este usuario?")) return;
    setDeletingId(id);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/admin/usuarios/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showAlert("success", `Usuario eliminado correctamente (id: ${id}).`);
      await fetchUsuarios();
    } catch (error) {
      const parsed = parseAxiosError(error);
      showAlert("danger", `No se pudo eliminar el usuario. ${parsed.message}`);
      console.error("handleDelete:", parsed);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Container className="mt-4">
      <Card>
        <Card.Header>
          <Row className="align-items-center">
            <Col>
              <h4>Gestión de Usuarios</h4>
            </Col>
            <Col md="4">
              <Form.Control
                type="text"
                placeholder="Buscar usuario"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </Col>
            <Col className="text-end">
              <Button onClick={() => handleOpenModal()}>Nuevo Usuario</Button>
            </Col>
          </Row>
        </Card.Header>

        <Card.Body>
          {alertState.visible && (
            <Alert
              variant={alertState.variant}
              onClose={() => setAlertState((s) => ({ ...s, visible: false }))}
              dismissible
            >
              {alertState.message}
            </Alert>
          )}

          {isLoading ? (
            <div className="text-center my-3">
              <Spinner animation="border" role="status" />
            </div>
          ) : (
            <>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Apellido</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(usuarios || []).map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>{u.nombre}</td>
                      <td>{u.apellido}</td>
                      <td>{u.telefono}</td>
                      <td>{u.email}</td>
                      <td>{roles.find((r) => r.id === u.rol_id)?.nombre || "-"}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="warning"
                          onClick={() => handleOpenModal(u)}
                          className="me-2"
                          disabled={isSaving || deletingId === u.id}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(u.id)}
                          disabled={isSaving || deletingId === u.id}
                        >
                          {deletingId === u.id ? (
                            <>
                              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Eliminando...
                            </>
                          ) : (
                            "Eliminar"
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <Pagination className="justify-content-center">
                <Pagination.First disabled={page === 1} onClick={() => setPage(1)} />
                <Pagination.Prev disabled={page === 1} onClick={() => setPage((prev) => Math.max(prev - 1, 1))} />
                {[...Array(totalPages)].map((_, i) => (
                  <Pagination.Item key={i} active={page === i + 1} onClick={() => setPage(i + 1)}>
                    {i + 1}
                  </Pagination.Item>
                ))}
                <Pagination.Next disabled={page === totalPages} onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))} />
                <Pagination.Last disabled={page === totalPages} onClick={() => setPage(totalPages)} />
              </Pagination>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Modal Crear/Editar */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-2">
              <Form.Label>Nombre</Form.Label>
              <Form.Control name="nombre" value={formData.nombre} onChange={handleChange} />
              {fieldErrors.nombre && <Form.Text className="text-danger">{fieldErrors.nombre}</Form.Text>}
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Apellido</Form.Label>
              <Form.Control name="apellido" value={formData.apellido} onChange={handleChange} />
              {fieldErrors.apellido && <Form.Text className="text-danger">{fieldErrors.apellido}</Form.Text>}
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Teléfono</Form.Label>
              <Form.Control
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="Solo 10 dígitos"
                maxLength={10}
              />
              {fieldErrors.telefono && <Form.Text className="text-danger">{fieldErrors.telefono}</Form.Text>}
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="usuario@midominio.com"
              />
              {fieldErrors.email && <Form.Text className="text-danger">{fieldErrors.email}</Form.Text>}
            </Form.Group>

            {!editingUser && (
              <Form.Group className="mb-2">
                <Form.Label>Contraseña</Form.Label>
                <Form.Control type="password" name="password" value={formData.password} onChange={handleChange} />
                {fieldErrors.password && <Form.Text className="text-danger">{fieldErrors.password}</Form.Text>}
              </Form.Group>
            )}

            <Form.Group className="mb-2">
              <Form.Label>Rol</Form.Label>
              <Form.Select name="rol_id" value={formData.rol_id} onChange={handleChange}>
                <option value="">Seleccione un rol</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </Form.Select>
              {fieldErrors.rol_id && <Form.Text className="text-danger">{fieldErrors.rol_id}</Form.Text>}
            </Form.Group>

            {fieldErrors._general && <Alert variant="danger">{fieldErrors._general}</Alert>}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CrudUsuarios;
