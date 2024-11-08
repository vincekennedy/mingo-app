import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class RegisterComponent {
  email: string = '';
  password: string = '';
  errorMessage: string | null = null;

  constructor(private auth: Auth, private router: Router) {}

  async onRegister() {
    this.errorMessage = null;
    try {
      await createUserWithEmailAndPassword(this.auth, this.email, this.password);
      this.router.navigate(['/']); // Redirect to the home page after successful registration
    } catch (error: any) {
      this.errorMessage = error.message;
    }
  }
}
