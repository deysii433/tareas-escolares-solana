// Programa: Tareas Escolares (Solana + Anchor)
// Modelo: Grupo (profesor) -> Alumno -> Tarea, todas como PDAs.
// Pegar en Solana Playground (src/lib.rs). Al hacer Build, Playground rellena declare_id!.

use anchor_lang::prelude::*;

declare_id!("7CLvTWMLF7E5pFpxYNn1rZHr4rPimoDWzhKDXUzjGoBQ");

const MAX_NOMBRE: usize = 32;
const MAX_DESCRIPCION: usize = 200;
const MAX_CALIFICACION: u8 = 100;

#[program]
pub mod tareas_escolares {
    use super::*;

    // ---------- GRUPO ----------

    /// Crea un grupo. El firmante queda como profesor (autoridad).
    pub fn crear_grupo(ctx: Context<CrearGrupo>, nombre: String) -> Result<()> {
        validar_texto(&nombre, MAX_NOMBRE)?;
        let grupo = &mut ctx.accounts.grupo;
        grupo.profesor = ctx.accounts.profesor.key();
        grupo.nombre = nombre;
        grupo.total_alumnos = 0;
        grupo.bump = ctx.bumps.grupo;
        Ok(())
    }

    /// Cierra el grupo. Regla: solo si ya no tiene alumnos.
    pub fn eliminar_grupo(ctx: Context<EliminarGrupo>) -> Result<()> {
        require!(
            ctx.accounts.grupo.total_alumnos == 0,
            ErrorTareas::GrupoConAlumnos
        );
        Ok(())
    }

    // ---------- ALUMNO ----------

    pub fn agregar_alumno(ctx: Context<AgregarAlumno>, nombre: String) -> Result<()> {
        validar_texto(&nombre, MAX_NOMBRE)?;
        let alumno = &mut ctx.accounts.alumno;
        alumno.grupo = ctx.accounts.grupo.key();
        alumno.nombre = nombre;
        alumno.total_tareas = 0;
        alumno.tareas_pendientes = 0;
        alumno.bump = ctx.bumps.alumno;

        let grupo = &mut ctx.accounts.grupo;
        grupo.total_alumnos = grupo
            .total_alumnos
            .checked_add(1)
            .ok_or(ErrorTareas::Desbordamiento)?;
        Ok(())
    }

    /// Cierra al alumno. Regla: solo si no tiene tareas registradas.
    pub fn eliminar_alumno(ctx: Context<EliminarAlumno>) -> Result<()> {
        require!(
            ctx.accounts.alumno.total_tareas == 0,
            ErrorTareas::AlumnoConTareas
        );
        let grupo = &mut ctx.accounts.grupo;
        grupo.total_alumnos = grupo
            .total_alumnos
            .checked_sub(1)
            .ok_or(ErrorTareas::Desbordamiento)?;
        Ok(())
    }

    // ---------- TAREA ----------

    pub fn crear_tarea(
        ctx: Context<CrearTarea>,
        titulo: String,
        descripcion: String,
    ) -> Result<()> {
        validar_texto(&titulo, MAX_NOMBRE)?;
        require!(
            descripcion.len() <= MAX_DESCRIPCION,
            ErrorTareas::DescripcionMuyLarga
        );
        let tarea = &mut ctx.accounts.tarea;
        tarea.alumno = ctx.accounts.alumno.key();
        tarea.titulo = titulo;
        tarea.descripcion = descripcion;
        tarea.calificada = false;
        tarea.calificacion = 0;
        tarea.bump = ctx.bumps.tarea;

        let alumno = &mut ctx.accounts.alumno;
        alumno.total_tareas = alumno
            .total_tareas
            .checked_add(1)
            .ok_or(ErrorTareas::Desbordamiento)?;
        alumno.tareas_pendientes = alumno
            .tareas_pendientes
            .checked_add(1)
            .ok_or(ErrorTareas::Desbordamiento)?;
        Ok(())
    }

    /// Modifica la descripción. Regla: no se puede editar una tarea ya calificada.
    pub fn editar_tarea(ctx: Context<ModificarTarea>, descripcion: String) -> Result<()> {
        require!(
            descripcion.len() <= MAX_DESCRIPCION,
            ErrorTareas::DescripcionMuyLarga
        );
        let tarea = &mut ctx.accounts.tarea;
        require!(!tarea.calificada, ErrorTareas::TareaYaCalificada);
        tarea.descripcion = descripcion;
        Ok(())
    }

    /// Califica la tarea (0-100). Se puede corregir la calificación después.
    pub fn calificar_tarea(ctx: Context<ModificarTarea>, calificacion: u8) -> Result<()> {
        require!(
            calificacion <= MAX_CALIFICACION,
            ErrorTareas::CalificacionInvalida
        );
        let tarea = &mut ctx.accounts.tarea;
        if !tarea.calificada {
            let alumno = &mut ctx.accounts.alumno;
            alumno.tareas_pendientes = alumno
                .tareas_pendientes
                .checked_sub(1)
                .ok_or(ErrorTareas::Desbordamiento)?;
        }
        tarea.calificada = true;
        tarea.calificacion = calificacion;
        Ok(())
    }

    /// Cierra la tarea y devuelve la renta al profesor.
    /// Regla: solo se pueden eliminar tareas ya calificadas.
    pub fn eliminar_tarea(ctx: Context<EliminarTarea>) -> Result<()> {
        require!(
            ctx.accounts.tarea.calificada,
            ErrorTareas::TareaNoCalificada
        );
        let alumno = &mut ctx.accounts.alumno;
        alumno.total_tareas = alumno
            .total_tareas
            .checked_sub(1)
            .ok_or(ErrorTareas::Desbordamiento)?;
        Ok(())
    }
}

fn validar_texto(texto: &str, max: usize) -> Result<()> {
    require!(!texto.trim().is_empty(), ErrorTareas::TextoVacio);
    require!(texto.len() <= max, ErrorTareas::TextoMuyLargo);
    Ok(())
}

// ================= CUENTAS =================

#[account]
#[derive(InitSpace)]
pub struct Grupo {
    pub profesor: Pubkey,
    #[max_len(32)]
    pub nombre: String,
    pub total_alumnos: u32,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Alumno {
    pub grupo: Pubkey,
    #[max_len(32)]
    pub nombre: String,
    pub total_tareas: u32,
    pub tareas_pendientes: u32,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Tarea {
    pub alumno: Pubkey,
    #[max_len(32)]
    pub titulo: String,
    #[max_len(200)]
    pub descripcion: String,
    pub calificada: bool,
    pub calificacion: u8,
    pub bump: u8,
}

// ================= CONTEXTOS =================

#[derive(Accounts)]
#[instruction(nombre: String)]
pub struct CrearGrupo<'info> {
    #[account(mut)]
    pub profesor: Signer<'info>,
    #[account(
        init,
        payer = profesor,
        space = 8 + Grupo::INIT_SPACE,
        seeds = [b"grupo", profesor.key().as_ref(), nombre.as_bytes()],
        bump
    )]
    pub grupo: Account<'info, Grupo>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EliminarGrupo<'info> {
    #[account(mut)]
    pub profesor: Signer<'info>,
    #[account(
        mut,
        close = profesor,
        has_one = profesor @ ErrorTareas::NoAutorizado,
        seeds = [b"grupo", profesor.key().as_ref(), grupo.nombre.as_bytes()],
        bump = grupo.bump
    )]
    pub grupo: Account<'info, Grupo>,
}

#[derive(Accounts)]
#[instruction(nombre: String)]
pub struct AgregarAlumno<'info> {
    #[account(mut)]
    pub profesor: Signer<'info>,
    #[account(
        mut,
        has_one = profesor @ ErrorTareas::NoAutorizado,
        seeds = [b"grupo", profesor.key().as_ref(), grupo.nombre.as_bytes()],
        bump = grupo.bump
    )]
    pub grupo: Account<'info, Grupo>,
    #[account(
        init,
        payer = profesor,
        space = 8 + Alumno::INIT_SPACE,
        seeds = [b"alumno", grupo.key().as_ref(), nombre.as_bytes()],
        bump
    )]
    pub alumno: Account<'info, Alumno>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EliminarAlumno<'info> {
    #[account(mut)]
    pub profesor: Signer<'info>,
    #[account(
        mut,
        has_one = profesor @ ErrorTareas::NoAutorizado,
        seeds = [b"grupo", profesor.key().as_ref(), grupo.nombre.as_bytes()],
        bump = grupo.bump
    )]
    pub grupo: Account<'info, Grupo>,
    #[account(
        mut,
        close = profesor,
        has_one = grupo @ ErrorTareas::CuentaNoRelacionada,
        seeds = [b"alumno", grupo.key().as_ref(), alumno.nombre.as_bytes()],
        bump = alumno.bump
    )]
    pub alumno: Account<'info, Alumno>,
}

#[derive(Accounts)]
#[instruction(titulo: String)]
pub struct CrearTarea<'info> {
    #[account(mut)]
    pub profesor: Signer<'info>,
    #[account(
        has_one = profesor @ ErrorTareas::NoAutorizado,
        seeds = [b"grupo", profesor.key().as_ref(), grupo.nombre.as_bytes()],
        bump = grupo.bump
    )]
    pub grupo: Account<'info, Grupo>,
    #[account(
        mut,
        has_one = grupo @ ErrorTareas::CuentaNoRelacionada,
        seeds = [b"alumno", grupo.key().as_ref(), alumno.nombre.as_bytes()],
        bump = alumno.bump
    )]
    pub alumno: Account<'info, Alumno>,
    #[account(
        init,
        payer = profesor,
        space = 8 + Tarea::INIT_SPACE,
        seeds = [b"tarea", alumno.key().as_ref(), titulo.as_bytes()],
        bump
    )]
    pub tarea: Account<'info, Tarea>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ModificarTarea<'info> {
    pub profesor: Signer<'info>,
    #[account(
        has_one = profesor @ ErrorTareas::NoAutorizado,
        seeds = [b"grupo", profesor.key().as_ref(), grupo.nombre.as_bytes()],
        bump = grupo.bump
    )]
    pub grupo: Account<'info, Grupo>,
    #[account(
        mut,
        has_one = grupo @ ErrorTareas::CuentaNoRelacionada,
        seeds = [b"alumno", grupo.key().as_ref(), alumno.nombre.as_bytes()],
        bump = alumno.bump
    )]
    pub alumno: Account<'info, Alumno>,
    #[account(
        mut,
        has_one = alumno @ ErrorTareas::CuentaNoRelacionada,
        seeds = [b"tarea", alumno.key().as_ref(), tarea.titulo.as_bytes()],
        bump = tarea.bump
    )]
    pub tarea: Account<'info, Tarea>,
}

#[derive(Accounts)]
pub struct EliminarTarea<'info> {
    #[account(mut)]
    pub profesor: Signer<'info>,
    #[account(
        has_one = profesor @ ErrorTareas::NoAutorizado,
        seeds = [b"grupo", profesor.key().as_ref(), grupo.nombre.as_bytes()],
        bump = grupo.bump
    )]
    pub grupo: Account<'info, Grupo>,
    #[account(
        mut,
        has_one = grupo @ ErrorTareas::CuentaNoRelacionada,
        seeds = [b"alumno", grupo.key().as_ref(), alumno.nombre.as_bytes()],
        bump = alumno.bump
    )]
    pub alumno: Account<'info, Alumno>,
    #[account(
        mut,
        close = profesor,
        has_one = alumno @ ErrorTareas::CuentaNoRelacionada,
        seeds = [b"tarea", alumno.key().as_ref(), tarea.titulo.as_bytes()],
        bump = tarea.bump
    )]
    pub tarea: Account<'info, Tarea>,
}

// ================= ERRORES =================

#[error_code]
pub enum ErrorTareas {
    #[msg("El texto no puede estar vacío")]
    TextoVacio,
    #[msg("El texto supera los 32 caracteres")]
    TextoMuyLargo,
    #[msg("La descripción supera los 200 caracteres")]
    DescripcionMuyLarga,
    #[msg("La calificación debe estar entre 0 y 100")]
    CalificacionInvalida,
    #[msg("Solo el profesor del grupo puede hacer esta operación")]
    NoAutorizado,
    #[msg("La cuenta no pertenece a este grupo o alumno")]
    CuentaNoRelacionada,
    #[msg("No se puede eliminar un grupo que todavía tiene alumnos")]
    GrupoConAlumnos,
    #[msg("No se puede eliminar un alumno que todavía tiene tareas")]
    AlumnoConTareas,
    #[msg("Solo se pueden eliminar tareas ya calificadas")]
    TareaNoCalificada,
    #[msg("No se puede editar una tarea ya calificada")]
    TareaYaCalificada,
    #[msg("Desbordamiento numérico")]
    Desbordamiento,
}
