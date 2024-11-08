import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }),
      provideRouter(routes),
      provideClientHydration(),
      provideFirebaseApp(() => initializeApp({"projectId":"mingo-85783","appId":"1:293268625810:web:ff57964decb6449770494b","storageBucket":"mingo-85783.firebasestorage.app","apiKey":"AIzaSyBwryOj5Gh5ZQ_1uKkOzhr6KSLXbNr7YvA","authDomain":"mingo-85783.firebaseapp.com","messagingSenderId":"293268625810","measurementId":"G-MK5M8X7WEP"})),
      provideFirestore(() => getFirestore()),
      provideAuth(() => getAuth())]
};
