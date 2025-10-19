use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint,self};


declare_id!("4HLUu1ADK6xzXaPQyLp13P8eJxWFjiCiMiobLSiBFXKA");

#[program]
pub mod vault_contract {
    use super::*;

    pub fn initialize_vault(ctx: Context<Initialize>) -> Result<()> {
        let vault = &mut ctx.accounts.vault_metadata;
        vault.seller = ctx.accounts.admin.key();
        vault.token_mint = ctx.accounts.token_mint_address.key();
        vault.total_deposite = 0;

        Ok(())
    }

    pub fn deposite(ctx:Context<Deposite>,amount:u64) -> Result<()> {

        let vault_metadata = &mut ctx.accounts.vault_metadata;
        let vault_account = &mut ctx.accounts.vault_account;

        let user= &ctx.accounts.user;


        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.user_token_ata.to_account_info(),
                    to: vault_account.to_account_info(),
                    authority: user.to_account_info(),
                }
            ),
            amount,
        )?;


        vault_metadata.total_deposite += amount;

        Ok(())
    }

    pub fn withdraw(ctx:Context<Withdraw>,amount:u64) -> Result<()> {

        let vault_metadata = &mut ctx.accounts.vault_metadata;
        let vault_account = &mut ctx.accounts.vault_account;

        let user= &ctx.accounts.user;

        let bump = ctx.bumps.vault_metadata;

        let seeds = &[b"vault_metadata", vault_metadata.seller.as_ref(), &[bump]];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from:vault_account.to_account_info(),
                    to:ctx.accounts.user_token_ata.to_account_info(),
                    authority:vault_metadata.to_account_info(),
                },
                signer
            ),
            amount,
        )?;

        vault_metadata.total_deposite -= amount;

        Ok(())
    }

    
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user:Signer<'info>,

    #[account(mut)]
    pub user_token_ata:Account<'info,TokenAccount>,

    #[account(
        mut,
        seeds=[b"vault_metadata",vault_metadata.seller.as_ref()],
        bump
    )]
    pub vault_metadata:Account<'info,Vault>,

    #[account(
        mut,
        seeds=[b"vault_account",vault_metadata.seller.as_ref()],
        bump
    )]
    pub vault_account:Account<'info,TokenAccount>,

    pub token_program:Program<'info,Token>,

}


#[derive(Accounts)]
pub struct Deposite<'info> {
    #[account(mut)]
    pub user:Signer<'info>,

    pub user_token_mint_address:Account<'info,Mint>,
    #[account(
        mut,
        constraint=user_token_ata.mint==user_token_mint_address.key(),
        constraint=user_token_ata.owner==user.key(),
    )]
    pub user_token_ata:Account<'info,TokenAccount>,

    #[account(
        mut,
        seeds=[b"vault_metadata",vault_metadata.seller.as_ref()],
        bump
    )]
    pub vault_metadata:Account<'info,Vault>,

    #[account(
        mut,
        seeds=[b"vault_account",vault_metadata.seller.as_ref()],
        bump
    )]
    pub vault_account:Account<'info,TokenAccount>,

    pub token_program:Program<'info,Token>,

}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    pub token_mint_address: Account<'info, Mint>,

    #[account(
        mut,
        constraint=token_ata.mint==token_mint_address.key(),
        constraint=token_ata.owner==admin.key(),
    )]
    pub token_ata: Account<'info, TokenAccount>,

    #[account(
        init,
        payer=admin,
        space=8+32+32+8,
        seeds=[b"vault_metadata",admin.key().as_ref()],
        bump
    )]
    pub vault_metadata: Account<'info, Vault>,

    #[account(
        init,
        payer=admin,
        token::mint=token_mint_address,
        token::authority=vault_metadata,
        seeds = [b"vault_account", admin.key().as_ref()],
        bump
    )]
    pub vault_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct Vault {
    pub seller: Pubkey,
    pub token_mint: Pubkey,
    pub total_deposite: u64,   
}