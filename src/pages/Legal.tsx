import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollText, ShieldCheck } from "lucide-react";

export default function Legal() {
  const location = useLocation();
  const initial = location.hash === "#privacidad" ? "privacidad" : "terminos";

  useEffect(() => {
    document.title = "Términos y Privacidad · CareCentral";
  }, []);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Aviso legal
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Términos y condiciones de uso y aviso de privacidad de CareCentral.
        </p>
      </header>

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue={initial} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-b-none">
              <TabsTrigger value="terminos" className="gap-2">
                <ScrollText className="h-4 w-4" /> Términos y condiciones
              </TabsTrigger>
              <TabsTrigger value="privacidad" className="gap-2">
                <ShieldCheck className="h-4 w-4" /> Aviso de privacidad
              </TabsTrigger>
            </TabsList>

            <TabsContent value="terminos" className="prose prose-sm max-w-none p-6 text-foreground">
              <h2>Términos y condiciones de uso</h2>
              <p className="text-muted-foreground">Última actualización: abril 2026</p>

              <h3>1. Aceptación</h3>
              <p>
                Al crear una cuenta o utilizar CareCentral aceptas estos términos. Si no estás de
                acuerdo, te pedimos no usar la plataforma.
              </p>

              <h3>2. Descripción del servicio</h3>
              <p>
                CareCentral es una plataforma digital para la gestión de tu expediente médico
                personal, recordatorios, citas, recetas y trámites de reclamos a aseguradoras.
                CareCentral <strong>no presta servicios médicos</strong> ni sustituye la consulta
                con un profesional de la salud.
              </p>

              <h3>3. Cuenta de usuario</h3>
              <p>
                Eres responsable de la veracidad de tus datos y de mantener la confidencialidad
                de tus credenciales de acceso. Cualquier actividad realizada desde tu cuenta se
                presume hecha por ti.
              </p>

              <h3>4. Uso permitido</h3>
              <ul>
                <li>Solo cargar información y documentos propios o autorizados.</li>
                <li>No usar la plataforma para fines ilícitos o fraudulentos.</li>
                <li>No interferir con la seguridad ni la operación del servicio.</li>
              </ul>

              <h3>5. Suscripciones y pagos</h3>
              <p>
                Algunos planes y paquetes son de pago. Los precios, beneficios y vigencia se
                muestran en la sección de Planes. Las renovaciones son automáticas hasta que el
                usuario las cancele desde su perfil.
              </p>

              <h3>6. Propiedad intelectual</h3>
              <p>
                La marca, el software y los contenidos de CareCentral son propiedad de sus
                titulares. Los datos clínicos que cargas siguen siendo tuyos.
              </p>

              <h3>7. Limitación de responsabilidad</h3>
              <p>
                CareCentral no se hace responsable por decisiones clínicas tomadas con base en la
                información mostrada, ni por la disponibilidad continua del servicio.
              </p>

              <h3>8. Modificaciones</h3>
              <p>
                Podemos actualizar estos términos. Notificaremos los cambios relevantes dentro de
                la aplicación.
              </p>

              <h3>9. Contacto</h3>
              <p>
                Para dudas sobre estos términos: <a href="mailto:legal@carcentral.app">legal@carcentral.app</a>
              </p>
            </TabsContent>

            <TabsContent value="privacidad" className="prose prose-sm max-w-none p-6 text-foreground">
              <h2>Aviso de privacidad</h2>
              <p className="text-muted-foreground">Última actualización: abril 2026</p>

              <h3>1. Responsable</h3>
              <p>
                CareCentral es responsable del tratamiento de los datos personales que nos
                proporcionas al usar la plataforma.
              </p>

              <h3>2. Datos que recabamos</h3>
              <ul>
                <li>Datos de identificación: nombre, correo, fotografía de perfil.</li>
                <li>Datos clínicos: expediente, recetas, estudios, signos vitales, citas.</li>
                <li>Datos de pago: gestionados por nuestros procesadores certificados.</li>
                <li>Datos técnicos: dispositivo, navegador, registros de acceso.</li>
              </ul>

              <h3>3. Finalidades</h3>
              <ul>
                <li>Brindar y mejorar el servicio de gestión médica personal.</li>
                <li>Recordatorios de medicamentos y citas.</li>
                <li>Procesar reclamos a aseguradoras cuando lo solicites.</li>
                <li>Cumplir obligaciones legales aplicables.</li>
              </ul>

              <h3>4. Compartición de datos</h3>
              <p>
                Solo compartimos tus datos con terceros cuando: (a) tú lo autorizas
                explícitamente — por ejemplo al asignar un médico o broker —, (b) lo exige una
                autoridad competente, o (c) son proveedores tecnológicos sujetos a confidencialidad
                (almacenamiento en la nube, procesador de pagos).
              </p>

              <h3>5. Derechos ARCO</h3>
              <p>
                Puedes <strong>Acceder, Rectificar, Cancelar u Oponerte</strong> al tratamiento de
                tus datos en cualquier momento desde tu perfil o escribiendo a{" "}
                <a href="mailto:privacidad@carcentral.app">privacidad@carcentral.app</a>.
              </p>

              <h3>6. Seguridad</h3>
              <p>
                Aplicamos medidas técnicas y organizativas para proteger tu información: cifrado
                en tránsito y en reposo, control de accesos por rol, y registros de auditoría.
              </p>

              <h3>7. Conservación</h3>
              <p>
                Conservamos tus datos mientras tu cuenta esté activa. Tras la cancelación, los
                datos se eliminan en un plazo razonable salvo que la ley exija conservarlos.
              </p>

              <h3>8. Cambios al aviso</h3>
              <p>
                Publicaremos cualquier cambio en esta misma página y, cuando sea relevante, te
                avisaremos en la aplicación.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}