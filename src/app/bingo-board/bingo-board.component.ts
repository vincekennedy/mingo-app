import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collectionData, collection, doc, getDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

interface BingoCell {
  square: string;
  marked: boolean;
}

@Component({
  selector: 'app-bingo-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bingo-board.component.html',
  styleUrls: ['./bingo-board.component.css']
})
export class BingoBoardComponent implements OnInit {
  gameData: any;

  constructor(private firestore: Firestore) {}

  ngOnInit(): void {
    this.fetchGameById('9X30');
  }

  async fetchGameById(gameCode: string): Promise<void> {
    try {
      const gameRef = doc(this.firestore, 'games', '9X3O');
      const gameSnap = await getDoc(gameRef);

      if (gameSnap.exists()) {
        const shuffled = this.shuffleArray(gameSnap.data()['squares']);
        console.log(shuffled);
        this.gameData = {
          squares: Array(25).fill(null).map((_, i) => ({
            value: shuffled[i],
            selected: false
          }))
        };
      } else {
        console.log('No such game found!');
      }
    } catch (error) {
      console.error('Error fetching game:', error);
    }
  }

  shuffleArray(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
  }

  toggleSelection(index: number): void {
    console.log('toggle', index);
    this.gameData.squares[index].selected = !this.gameData.squares[index].selected;
  }

}
