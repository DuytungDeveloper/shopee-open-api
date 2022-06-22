import moment from 'moment'
import { isNativeError } from 'util/types'

export const splitDate = (
  dateFrom: Date,
  dateTo: Date,
  dayBreak: number = 15
) => {
  dateFrom = new Date(dateFrom)
  dateTo = new Date(dateTo)
  const lsDate = []
  const rangeDay = dateTo.getTime() - dateFrom.getTime()
  const numberTime = Math.floor(rangeDay / 1000 / 60 / 60 / 24 / dayBreak)
  const dayLeft = rangeDay / 1000 / 60 / 60 / 24 - numberTime * dayBreak
  if (numberTime > 0) {
    for (let index = 0; index < numberTime; index++) {
      dateTo = new Date(moment(dateFrom).add(dayBreak, 'days').format())
      const element = {
        from: dateFrom,
        to: dateTo
      }
      dateFrom = dateTo
      lsDate.push(element)
    }
    if (dayLeft > 0) {
      dateTo = new Date(moment(dateFrom).add(dayLeft, 'days').format())
      const element = {
        from: dateFrom,
        to: dateTo
      }
      dateFrom = dateTo
      lsDate.push(element)
    }
  } else {
    const element = {
      from: dateFrom,
      to: new Date(
        moment(dateTo).add(23, 'h').add(59, 'm').add(59, 's').format()
      )
    }
    lsDate.push(element)
  }
  return lsDate
}

/**
 * Nếu funcion được truyền vào chạy sai thì nó sẽ được chạy lại với số time được truyền vào, hay nói đơn giản là nó phải chạy đến khi nào đúng thì thôi nhưng với limit là time.
 * Chỉ áp dụng cho những function có try catch và trả về lỗi.
 * @param {*} func hàm chạy
 * @param {*} time Số lần thử lại
 */
export async function tryFunctionTime<T extends any> (
  func: Function,
  time = 2
): Promise<T | Error> {
  try {
    const rs = await func()
    if (isNativeError(rs)) {
      while (time > 0) {
        const rs = await func()
        if (isNativeError(rs)) {
          time--
          if (time === 0) {
            return rs
          }
        } else {
          return rs as T
        }
      }
    }
    return rs as T
  } catch (e) {
    return e as Error
  }
}
