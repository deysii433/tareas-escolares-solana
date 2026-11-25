// Pruebas para Solana Playground (pestaña "Test").
// Copia este archivo a la carpeta tests/ de tu proyecto en beta.solpg.io y presiona "Test".
// Envían transacciones REALES a Devnet con la wallet de Playground (pg.wallet).

describe("Tareas Escolares", () => {
  const sufijo = Date.now().toString().slice(-6); // nombres únicos en cada ejecución
  const nombreGrupo = `G-${sufijo}`;
  const nombreAlumno = `Ana ${sufijo}`;
  const titulo = `Tarea ${sufijo}`;

  const enc = (s: string) => Buffer.from(s, "utf8");
  const pid = pg.PROGRAM_ID;
  const profesor = pg.wallet.publicKey;

  const [grupo] = web3.PublicKey.findProgramAddressSync(
    [enc("grupo"), profesor.toBuffer(), enc(nombreGrupo)], pid);
  const [alumno] = web3.PublicKey.findProgramAddressSync(
    [enc("alumno"), grupo.toBuffer(), enc(nombreAlumno)], pid);
  const [tarea] = web3.PublicKey.findProgramAddressSync(
    [enc("tarea"), alumno.toBuffer(), enc(titulo)], pid);

  const sistema = web3.SystemProgram.programId;
  const ctxTarea = { profesor, grupo, alumno, tarea };

  /** Espera que la promesa falle con el error indicado (caso de rechazo). */
  async function debeFallar(p: Promise<unknown>, error: string | string[]) {
    const esperados = Array.isArray(error) ? error : [error];
    try {
      await p;
    } catch (e) {
      const texto = String(e) + JSON.stringify((e as any).logs ?? "");
      assert.ok(esperados.some((x) => texto.includes(x)), `Se esperaba ${error} y llegó: ${texto}`);
      console.log(`   ✔ rechazado correctamente: ${error}`);
      return;
    }
    assert.fail(`La operación debía fallar con ${error}`);
  }

  it("crea grupo, alumno y tarea", async () => {
    let tx = await pg.program.methods.crearGrupo(nombreGrupo)
      .accounts({ profesor, grupo, systemProgram: sistema }).rpc();
    console.log("crear_grupo:", tx);

    tx = await pg.program.methods.agregarAlumno(nombreAlumno)
      .accounts({ profesor, grupo, alumno, systemProgram: sistema }).rpc();
    console.log("agregar_alumno:", tx);

    tx = await pg.program.methods.crearTarea(titulo, "Entregar APK")
      .accounts({ ...ctxTarea, systemProgram: sistema }).rpc();
    console.log("crear_tarea:", tx);

    const g = await pg.program.account.grupo.fetch(grupo);
    const a = await pg.program.account.alumno.fetch(alumno);
    const t = await pg.program.account.tarea.fetch(tarea);
    assert.equal(g.totalAlumnos, 1);
    assert.equal(a.totalTareas, 1);
    assert.equal(a.tareasPendientes, 1);
    assert.equal(t.calificada, false);
  });

  it("edita la descripción mientras está pendiente", async () => {
    await pg.program.methods.editarTarea("Entregar APK y capturas").accounts(ctxTarea).rpc();
    const t = await pg.program.account.tarea.fetch(tarea);
    assert.equal(t.descripcion, "Entregar APK y capturas");
  });

  it("RECHAZA eliminar una tarea que no está calificada", async () => {
    await debeFallar(pg.program.methods.eliminarTarea().accounts(ctxTarea).rpc(), "TareaNoCalificada");
  });

  it("RECHAZA una calificación mayor a 100", async () => {
    await debeFallar(pg.program.methods.calificarTarea(150).accounts(ctxTarea).rpc(), "CalificacionInvalida");
  });

  it("RECHAZA eliminar el grupo mientras tenga alumnos", async () => {
    await debeFallar(pg.program.methods.eliminarGrupo().accounts({ profesor, grupo }).rpc(), "GrupoConAlumnos");
  });

  it("RECHAZA que otra wallet modifique la tarea", async () => {
    const intruso = web3.Keypair.generate();
    // El intruso no necesita SOL: la simulación falla antes de cobrar comisión.
    const ix = await pg.program.methods.calificarTarea(100)
      .accounts({ profesor: intruso.publicKey, grupo, alumno, tarea }).instruction();
    const tx = new web3.Transaction().add(ix);
    tx.feePayer = profesor;
    tx.recentBlockhash = (await pg.connection.getLatestBlockhash()).blockhash;
    tx.partialSign(intruso);
    const firmada = await pg.wallet.signTransaction(tx);
    // has_one = profesor → NoAutorizado (6004 = 0x1774), o seeds del grupo → ConstraintSeeds (2006 = 0x7d6)
    await debeFallar(pg.connection.sendRawTransaction(firmada.serialize()), ["0x1774", "0x7d6", "NoAutorizado"]);
  });

  it("califica la tarea", async () => {
    const tx = await pg.program.methods.calificarTarea(95).accounts(ctxTarea).rpc();
    console.log("calificar_tarea:", tx);
    const t = await pg.program.account.tarea.fetch(tarea);
    const a = await pg.program.account.alumno.fetch(alumno);
    assert.equal(t.calificada, true);
    assert.equal(t.calificacion, 95);
    assert.equal(a.tareasPendientes, 0);
  });

  it("RECHAZA editar una tarea ya calificada", async () => {
    await debeFallar(pg.program.methods.editarTarea("cambio").accounts(ctxTarea).rpc(), "TareaYaCalificada");
  });

  it("RECHAZA eliminar al alumno mientras tenga tareas", async () => {
    await debeFallar(
      pg.program.methods.eliminarAlumno().accounts({ profesor, grupo, alumno }).rpc(),
      "AlumnoConTareas",
    );
  });

  it("elimina tarea → alumno → grupo y recupera la renta", async () => {
    let tx = await pg.program.methods.eliminarTarea().accounts(ctxTarea).rpc();
    console.log("eliminar_tarea:", tx);
    tx = await pg.program.methods.eliminarAlumno().accounts({ profesor, grupo, alumno }).rpc();
    console.log("eliminar_alumno:", tx);
    tx = await pg.program.methods.eliminarGrupo().accounts({ profesor, grupo }).rpc();
    console.log("eliminar_grupo:", tx);

    assert.equal(await pg.connection.getAccountInfo(tarea), null);
    assert.equal(await pg.connection.getAccountInfo(alumno), null);
    assert.equal(await pg.connection.getAccountInfo(grupo), null);
  });
});
