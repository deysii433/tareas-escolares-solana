// Pruebas del cliente (no envían transacciones). Ejecutar: npm test
import { describe, expect, it } from "vitest";
import { Keypair, PublicKey } from "@solana/web3.js";
import { pdaAlumno, pdaGrupo, pdaTarea } from "../src/solana/pdas";
import { validarCalificacion, validarDescripcion, validarNombre } from "../src/solana/validaciones";
import { traducirError } from "../src/solana/errores";
import {
  ixAgregarAlumno,
  ixCalificarTarea,
  ixCrearGrupo,
  ixCrearTarea,
} from "../src/solana/acciones";
import { aWeb3 } from "../src/solana/tx";
import idl from "../idl.json";

const profesor = Keypair.generate().publicKey;

describe("PDAs", () => {
  it("son deterministas y dependen del padre", () => {
    const g1 = pdaGrupo(profesor, "402");
    expect(pdaGrupo(profesor, "402").equals(g1)).toBe(true);
    expect(pdaGrupo(Keypair.generate().publicKey, "402").equals(g1)).toBe(false);
    const al = pdaAlumno(g1, "Ana");
    expect(pdaTarea(al, "Práctica 1")).toBeInstanceOf(PublicKey);
    expect(pdaTarea(al, "Práctica 1").equals(pdaTarea(al, "Práctica 2"))).toBe(false);
  });
});

describe("Validaciones (mismas reglas que el programa)", () => {
  it("rechaza nombres vacíos o de más de 32 bytes", () => {
    expect(validarNombre("")).not.toBeNull();
    expect(validarNombre("   ")).not.toBeNull();
    expect(validarNombre("a".repeat(33))).not.toBeNull();
    expect(validarNombre("ñ".repeat(17))).not.toBeNull(); // 34 bytes en UTF-8
    expect(validarNombre("Grupo 402")).toBeNull();
  });
  it("rechaza descripciones de más de 200 bytes", () => {
    expect(validarDescripcion("x".repeat(201))).not.toBeNull();
    expect(validarDescripcion("ok")).toBeNull();
  });
  it("solo acepta calificaciones enteras de 0 a 100", () => {
    expect(validarCalificacion(-1)).not.toBeNull();
    expect(validarCalificacion(101)).not.toBeNull();
    expect(validarCalificacion(9.5)).not.toBeNull();
    expect(validarCalificacion(0)).toBeNull();
    expect(validarCalificacion(100)).toBeNull();
  });
});

describe("Instrucciones generadas con Codama", () => {
  it("crear_grupo usa el discriminador del IDL y marca al profesor como firmante", () => {
    const ix = aWeb3(ixCrearGrupo(profesor, "402"));
    const disc = idl.instructions.find((i) => i.name === "crear_grupo")!.discriminator;
    expect([...ix.data.subarray(0, 8)]).toEqual(disc);
    expect(ix.keys[0].pubkey.equals(profesor)).toBe(true);
    expect(ix.keys[0].isSigner && ix.keys[0].isWritable).toBe(true);
    expect(ix.keys[1].pubkey.equals(pdaGrupo(profesor, "402"))).toBe(true);
    expect(ix.programId.toBase58()).toBe(idl.address);
  });

  it("agregar_alumno y crear_tarea derivan las PDAs correctas", () => {
    const g = pdaGrupo(profesor, "402");
    const ixA = aWeb3(ixAgregarAlumno(profesor, g, "Ana"));
    expect(ixA.keys.map((k) => k.pubkey.toBase58())).toContain(pdaAlumno(g, "Ana").toBase58());
    const al = pdaAlumno(g, "Ana");
    const ixT = aWeb3(ixCrearTarea(profesor, g, al, "P1", "desc"));
    expect(ixT.keys.map((k) => k.pubkey.toBase58())).toContain(pdaTarea(al, "P1").toBase58());
  });

  it("no construye instrucciones con datos inválidos", () => {
    const g = pdaGrupo(profesor, "402");
    const al = pdaAlumno(g, "Ana");
    expect(() => ixCrearGrupo(profesor, "")).toThrow();
    expect(() => ixCalificarTarea(profesor, g, al, pdaTarea(al, "P1"), 150)).toThrow();
  });
});

describe("Errores", () => {
  it("traduce errores propios del programa", () => {
    const e = idl.errors.find((x) => x.name === "TareaNoCalificada")!;
    expect(traducirError(new Error(`custom program error: 0x${e.code.toString(16)}`))).toBe(e.msg);
  });
  it("detecta cuando el usuario cancela la firma", () => {
    expect(traducirError(new Error("User rejected the request."))).toMatch(/Cancelaste/);
  });
});
